-- Push notification triggers for various events
-- These triggers call the send-push-notification edge function

-- Trigger: New message received
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_recipient_id uuid;
  v_sender_name text;
BEGIN
  -- Get the chat participants (for now, just use a basic approach)
  -- In a real implementation, you'd query the chats table to find the other participant

  -- Insert notification record (optional - for database tracking)
  INSERT INTO public.notifications (
    user_id,
    title,
    body,
    type,
    action_url
  ) VALUES (
    (SELECT CASE
      WHEN NEW.sender_id = (SELECT customer_id FROM chats WHERE id = NEW.chat_id)
      THEN (SELECT professional_id FROM chats WHERE id = NEW.chat_id)
      ELSE (SELECT customer_id FROM chats WHERE id = NEW.chat_id)
     END),
    (SELECT full_name FROM profiles WHERE id = NEW.sender_id),
    NEW.content,
    'message',
    '/messages/' || NEW.chat_id
  );

  -- Optionally call the edge function for push notification
  -- Note: This requires pg_net extension. If not available, skip this step
  -- and send push notifications from the client instead

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS after_message_insert ON public.messages;
CREATE TRIGGER after_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- Trigger: New offer created (notify the service request owner)
CREATE OR REPLACE FUNCTION public.notify_new_offer()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    body,
    type,
    action_url
  ) VALUES (
    (SELECT customer_id FROM service_requests WHERE id = NEW.service_request_id),
    'Yeni Teklif',
    (SELECT full_name FROM profiles WHERE id = NEW.professional_id) || ' tarafından teklif alındı',
    'offer',
    '/requests/' || NEW.service_request_id || '/offers'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS after_offer_insert ON public.offers;
CREATE TRIGGER after_offer_insert
  AFTER INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_offer();

-- Trigger: Offer status changed
CREATE OR REPLACE FUNCTION public.notify_offer_status_changed()
RETURNS TRIGGER AS $$
DECLARE
  v_status_text text;
  v_title text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_status_text := CASE NEW.status
      WHEN 'accepted' THEN 'Kabul Edildi'
      WHEN 'rejected' THEN 'Reddedildi'
      WHEN 'completed' THEN 'Tamamlandı'
      WHEN 'cancelled' THEN 'İptal Edildi'
      ELSE NEW.status
    END;

    v_title := CASE NEW.status
      WHEN 'accepted' THEN 'Teklifiniz Kabul Edildi'
      WHEN 'rejected' THEN 'Teklifiniz Reddedildi'
      WHEN 'completed' THEN 'İş Tamamlandı'
      WHEN 'cancelled' THEN 'Teklif İptal Edildi'
      ELSE 'Teklifin Durumu Değişti'
    END;

    INSERT INTO public.notifications (
      user_id,
      title,
      body,
      type,
      action_url
    ) VALUES (
      NEW.professional_id,
      v_title,
      v_status_text,
      'offer_status',
      '/requests/' || NEW.service_request_id || '/offers'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS after_offer_update ON public.offers;
CREATE TRIGGER after_offer_update
  AFTER UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.notify_offer_status_changed();
