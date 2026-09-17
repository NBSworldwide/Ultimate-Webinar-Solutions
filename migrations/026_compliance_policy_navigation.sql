INSERT INTO navigation_menu_items
  (id, menu_id, parent_id, label, href, item_type, entity_id, sort_order, open_in_new_tab, is_visible, auto_added, created_at, updated_at)
VALUES
  ('navigation-primary-privacy-policy', 'navigation-menu-primary', NULL, 'Privacy Policy', '/privacy-policy', 'system', 'privacy-policy', 6, FALSE, TRUE, FALSE, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('navigation-primary-terms', 'navigation-menu-primary', NULL, 'Terms & Conditions', '/terms-and-conditions', 'system', 'terms-and-conditions', 7, FALSE, TRUE, FALSE, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('navigation-footer-privacy-policy', 'navigation-menu-footer', NULL, 'Privacy Policy', '/privacy-policy', 'system', 'privacy-policy', 6, FALSE, TRUE, FALSE, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text),
  ('navigation-footer-terms', 'navigation-menu-footer', NULL, 'Terms & Conditions', '/terms-and-conditions', 'system', 'terms-and-conditions', 7, FALSE, TRUE, FALSE, CURRENT_TIMESTAMP::text, CURRENT_TIMESTAMP::text)
ON CONFLICT (menu_id, item_type, entity_id) DO NOTHING;
