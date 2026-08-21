-- Demo data for local development: one hotel, default request menu, one
-- room with an active stay so the guest login screen has something to hit.

insert into hotels (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Hotel Demo');

insert into rooms (hotel_id, room_number) values
  ('00000000-0000-0000-0000-000000000001', '304');

insert into stays (hotel_id, room_id, guest_last_name, check_in_at, check_out_at, source)
select '00000000-0000-0000-0000-000000000001', r.id, 'Rossi', now() - interval '1 day', now() + interval '2 days', 'manual'
from rooms r where r.room_number = '304';

with cat as (
  insert into request_categories (hotel_id, name, department, icon, sort_order) values
    ('00000000-0000-0000-0000-000000000001', 'Comfort camera', 'housekeeping', 'bed', 1),
    ('00000000-0000-0000-0000-000000000001', 'Bathroom', 'housekeeping', 'shower', 2),
    ('00000000-0000-0000-0000-000000000001', 'Housekeeping', 'housekeeping', 'sparkles', 3),
    ('00000000-0000-0000-0000-000000000001', 'Maintenance', 'maintenance', 'wrench', 4),
    ('00000000-0000-0000-0000-000000000001', 'Luggage', 'porter', 'briefcase', 5),
    ('00000000-0000-0000-0000-000000000001', 'Other', 'reception', 'dots', 6)
  returning id, name
)
insert into request_types (category_id, name, allows_quantity, sort_order)
select cat.id, t.name, t.allows_quantity, t.sort_order
from cat
join (values
  ('Comfort camera', 'Cuscino extra', true, 1),
  ('Comfort camera', 'Coperta', true, 2),
  ('Comfort camera', 'Ferro e asse da stiro', false, 3),
  ('Bathroom', 'Asciugamani', true, 1),
  ('Bathroom', 'Amenities', true, 2),
  ('Bathroom', 'Acqua', true, 3),
  ('Housekeeping', 'Pulizia camera', false, 1),
  ('Maintenance', 'Segnala un problema', false, 1),
  ('Luggage', 'Assistenza bagagli', false, 1),
  ('Other', 'Altra richiesta', false, 1)
) as t(category_name, name, allows_quantity, sort_order) on t.category_name = cat.name;
