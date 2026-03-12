-- Replace and update the confirm_reservation function to validate Razorpay Payments
CREATE OR REPLACE FUNCTION public.confirm_reservation(
  p_reservation_id uuid,
  p_payment_reference text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res reservations%ROWTYPE;
  v_lead_id uuid;
BEGIN
  -- 1. Validate Payment transaction exists and is successful
  -- This checks the 'payment_transactions' table introduced in Phase 1
  -- to ensure the frontend actually completed the Razorpay checkout.
  IF NOT EXISTS (
    SELECT 1 FROM payment_transactions 
    WHERE reservation_id = p_reservation_id 
      AND gateway_transaction_id = p_payment_reference 
      AND status = 'success'
  ) THEN 
    -- Log the failed validation attempt using Postgres RAISE LOG or simply return error
    RAISE LOG 'Confirm Reservation Failed: Valid successful payment transaction not found for Reservation ID %, Payment Ref %', p_reservation_id, p_payment_reference;
    RETURN jsonb_build_object('error', 'Valid successful payment transaction not found'); 
  END IF;

  SELECT * INTO v_res FROM reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Reservation not found'); END IF;
  IF v_res.reservation_status != 'pending' THEN RETURN jsonb_build_object('error', 'Reservation already processed'); END IF;

  -- 2. Update reservation status to paid
  UPDATE reservations SET reservation_status = 'paid', payment_reference = p_payment_reference, updated_at = now() WHERE id = p_reservation_id;

  -- 3. Create CRM lead with the website source
  INSERT INTO leads (name, phone, email, source, status, property_id, preferred_location, notes)
  VALUES (v_res.customer_name, v_res.customer_phone, v_res.customer_email, 'website', 'booked', v_res.property_id,
    (SELECT area FROM properties WHERE id = v_res.property_id),
    'Online reservation #' || p_reservation_id::text || ' | Payment: ' || p_payment_reference)
  RETURNING id INTO v_lead_id;

  -- 4. Update reservation with the new lead
  UPDATE reservations SET lead_id = v_lead_id WHERE id = p_reservation_id;

  -- 5. Create confirmed booking record
  INSERT INTO bookings (lead_id, property_id, room_id, bed_id, booking_status, monthly_rent, move_in_date, payment_status, notes)
  VALUES (v_lead_id, v_res.property_id, v_res.room_id, v_res.bed_id, 'confirmed', v_res.monthly_rent, v_res.move_in_date, 'partial', 'Online reservation fee paid via Razorpay');

  -- 6. Update bed status to fully booked
  IF v_res.bed_id IS NOT NULL THEN
    UPDATE beds SET status = 'booked' WHERE id = v_res.bed_id;
  END IF;

  -- 7. Deactivate the temporary soft lock
  IF v_res.soft_lock_id IS NOT NULL THEN
    UPDATE soft_locks SET is_active = false WHERE id = v_res.soft_lock_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'lead_id', v_lead_id, 'reservation_id', p_reservation_id);
END;
$$;
