-- =====================================================================
-- SkyNova Airlines — Supabase (PostgreSQL) seed
-- =====================================================================
-- Drop in reverse-FK order so re-runs are clean.
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS flights;
DROP TABLE IF EXISTS aircraft;
DROP TABLE IF EXISTS airports;
DROP TABLE IF EXISTS customers;

-- ---------- Schema -----------------------------------------------------

CREATE TABLE customers (
    customer_id     SERIAL PRIMARY KEY,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    phone           TEXT,
    country         TEXT,
    date_of_birth   DATE,
    loyalty_tier    TEXT CHECK (loyalty_tier IN ('None','Silver','Gold','Platinum')) DEFAULT 'None',
    loyalty_miles   INT  DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE airports (
    airport_code    CHAR(3) PRIMARY KEY,
    airport_name    TEXT NOT NULL,
    city            TEXT NOT NULL,
    country         TEXT NOT NULL
);

CREATE TABLE aircraft (
    aircraft_id     SERIAL PRIMARY KEY,
    registration    TEXT UNIQUE NOT NULL,
    model           TEXT NOT NULL,
    capacity        INT  NOT NULL
);

CREATE TABLE flights (
    flight_id       SERIAL PRIMARY KEY,
    flight_number   TEXT NOT NULL,
    origin          CHAR(3) REFERENCES airports(airport_code),
    destination     CHAR(3) REFERENCES airports(airport_code),
    departure_time  TIMESTAMP NOT NULL,
    arrival_time    TIMESTAMP NOT NULL,
    aircraft_id     INT REFERENCES aircraft(aircraft_id),
    status          TEXT CHECK (status IN ('Scheduled','Departed','Arrived','Completed','Delayed','Cancelled')),
    base_price_usd  NUMERIC(8,2) NOT NULL
);

CREATE TABLE bookings (
    booking_id          SERIAL PRIMARY KEY,
    booking_reference   TEXT UNIQUE NOT NULL,
    customer_id         INT REFERENCES customers(customer_id),
    flight_id           INT REFERENCES flights(flight_id),
    seat_number         TEXT,
    cabin_class         TEXT CHECK (cabin_class IN ('Economy','PremiumEconomy','Business','First')),
    fare_paid_usd       NUMERIC(8,2),
    booking_status      TEXT CHECK (booking_status IN ('Confirmed','CheckedIn','Completed','Cancelled','NoShow')),
    booked_at           TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_flight   ON bookings(flight_id);
CREATE INDEX idx_flights_route     ON flights(origin, destination);

-- ---------- Airports ---------------------------------------------------

INSERT INTO airports (airport_code, airport_name, city, country) VALUES
('DEL','Indira Gandhi International','Delhi','India'),
('BOM','Chhatrapati Shivaji Maharaj International','Mumbai','India'),
('LHR','Heathrow','London','United Kingdom'),
('JFK','John F. Kennedy International','New York','United States'),
('DXB','Dubai International','Dubai','United Arab Emirates'),
('SIN','Changi','Singapore','Singapore'),
('NRT','Narita International','Tokyo','Japan'),
('CDG','Charles de Gaulle','Paris','France');

-- ---------- Aircraft ---------------------------------------------------

INSERT INTO aircraft (aircraft_id, registration, model, capacity) VALUES
(1,'VT-SNA','Boeing 737-800',162),
(2,'VT-SNB','Boeing 737-800',162),
(3,'VT-SNC','Airbus A320neo',180),
(4,'VT-SND','Airbus A350-900',325),
(5,'VT-SNE','Boeing 787-9',296);

-- ---------- Customers (25) --------------------------------------------

INSERT INTO customers (customer_id, first_name, last_name, email, phone, country, date_of_birth, loyalty_tier, loyalty_miles) VALUES
( 1,'Aarav','Mehta','aarav.mehta@example.in','+91-98100-11201','India','1985-03-12','Platinum',145000),
( 2,'Priya','Singh','priya.singh@example.in','+91-98200-22102','India','1990-07-22','Gold',78000),
( 3,'James','Wilson','j.wilson@example.com','+1-415-555-0103','United States','1978-11-04','Silver',32000),
( 4,'Emma','Davis','emma.davis@example.co.uk','+44-20-7946-0104','United Kingdom','1988-02-18','Gold',65000),
( 5,'Liam','OBrien','liam.obrien@example.ie','+353-1-555-0105','Ireland','1995-09-30','None',0),
( 6,'Sofia','Garcia','sofia.garcia@example.es','+34-91-555-0106','Spain','1992-05-14','Silver',28000),
( 7,'Yuki','Tanaka','y.tanaka@example.jp','+81-3-5550-0107','Japan','1980-12-08','Platinum',162000),
( 8,'Marcus','Chen','marcus.chen@example.sg','+65-6555-0108','Singapore','1983-04-26','Gold',89000),
( 9,'Olivia','Brown','olivia.brown@example.ca','+1-416-555-0109','Canada','1996-08-11','None',5000),
(10,'Noah','Williams','noah.w@example.com.au','+61-2-5550-0110','Australia','1991-01-05','Silver',25000),
(11,'Isabella','Rossi','i.rossi@example.it','+39-06-5550-0111','Italy','1986-06-19','Gold',71000),
(12,'Mateo','Silva','mateo.silva@example.br','+55-11-5550-0112','Brazil','1999-10-23','None',0),
(13,'Aisha','Khan','aisha.khan@example.ae','+971-4-555-0113','United Arab Emirates','1982-03-01','Platinum',198000),
(14,'Ben','Carter','ben.carter@example.co.uk','+44-20-7946-0114','United Kingdom','1993-11-29','None',8500),
(15,'Chloe','Dubois','chloe.dubois@example.fr','+33-1-5550-0115','France','1989-07-07','Silver',30000),
(16,'Daniel','Mueller','daniel.mueller@example.de','+49-30-5550-0116','Germany','1984-09-16','Gold',82000),
(17,'Hana','Park','hana.park@example.kr','+82-2-5550-0117','South Korea','1994-12-03','Silver',27000),
(18,'Ivan','Petrov','ivan.petrov@example.ru','+7-495-555-0118','Russia','1981-02-25','None',12000),
(19,'Lucia','Fernandez','lucia.f@example.mx','+52-55-5550-0119','Mexico','1997-04-09','None',3000),
(20,'Maya','Patel','maya.patel@example.in','+91-98300-12120','India','1998-08-21','Silver',22000),
(21,'Nathan','Lee','nathan.lee@example.com','+1-212-555-0121','United States','1979-05-30','Platinum',156000),
(22,'Oliver','Smith','oliver.s@example.co.uk','+44-20-7946-0122','United Kingdom','1990-10-12','Silver',26500),
(23,'Sara','Ahmed','sara.ahmed@example.eg','+20-2-5550-0123','Egypt','1995-01-18','None',0),
(24,'Thomas','King','t.king@example.com','+1-312-555-0124','United States','1976-07-04','Gold',75000),
(25,'Zoe','Martin','zoe.martin@example.fr','+33-1-5550-0125','France','1992-11-27','None',7000);

-- ---------- Flights (15) ----------------------------------------------
-- Today (in this fictional dataset) = 2026-05-08. Flights span past + future.

INSERT INTO flights (flight_id, flight_number, origin, destination, departure_time, arrival_time, aircraft_id, status, base_price_usd) VALUES
( 1,'SN101','DEL','LHR','2026-04-15 22:00','2026-04-16 03:00',4,'Completed', 850.00),
( 2,'SN102','LHR','DEL','2026-04-17 14:00','2026-04-18 02:30',4,'Completed', 880.00),
( 3,'SN201','DEL','DXB','2026-04-20 03:30','2026-04-20 06:00',1,'Completed', 320.00),
( 4,'SN202','DXB','DEL','2026-04-22 22:00','2026-04-23 02:30',1,'Completed', 310.00),
( 5,'SN301','BOM','SIN','2026-04-25 23:30','2026-04-26 07:00',3,'Cancelled', 420.00),
( 6,'SN302','SIN','BOM','2026-04-26 21:30','2026-04-27 00:30',3,'Completed', 410.00),
( 7,'SN401','DEL','JFK','2026-05-01 03:00','2026-05-01 09:30',5,'Completed', 980.00),
( 8,'SN402','JFK','DEL','2026-05-03 20:00','2026-05-04 21:00',5,'Completed',1020.00),
( 9,'SN501','BOM','CDG','2026-05-05 02:00','2026-05-05 08:00',4,'Completed', 760.00),
(10,'SN502','CDG','BOM','2026-05-06 12:30','2026-05-07 00:30',4,'Departed', 790.00),
(11,'SN601','DEL','NRT','2026-05-09 21:00','2026-05-10 09:00',5,'Scheduled', 720.00),
(12,'SN602','NRT','DEL','2026-05-11 18:00','2026-05-12 00:30',5,'Scheduled', 740.00),
(13,'SN701','DEL','LHR','2026-05-15 22:00','2026-05-16 03:00',4,'Scheduled', 920.00),
(14,'SN702','LHR','DEL','2026-05-17 14:00','2026-05-18 02:30',4,'Scheduled', 890.00),
(15,'SN801','BOM','DXB','2026-05-20 02:30','2026-05-20 04:30',2,'Scheduled', 340.00);

-- Note: SN401 was operationally delayed by ~2hrs on 2026-05-01 (origin GA hold);
-- final status is Completed but several bookings filed delay-related tickets.
-- SN301 was cancelled the day-of due to a maintenance issue; affected pax were
-- offered refund or rebooking on SN302.

-- ---------- Bookings (50) ---------------------------------------------

INSERT INTO bookings (booking_id, booking_reference, customer_id, flight_id, seat_number, cabin_class, fare_paid_usd, booking_status, booked_at) VALUES
( 1,'SKY7A2K9F', 1, 1,'2A','Business',     2400.00,'Completed','2026-03-01 10:14'),
( 2,'SKY7A2K9G', 1, 2,'2A','Business',     2450.00,'Completed','2026-03-01 10:14'),
( 3,'SKYJ4N1QA', 1,13,'1A','Business',     2600.00,'Confirmed','2026-04-22 09:32'),
( 4,'SKY3B7M2H', 2, 3,'14C','Economy',      320.00,'Completed','2026-03-15 18:02'),
( 5,'SKY3B7M2J', 2, 4,'14C','Economy',      310.00,'Completed','2026-03-15 18:02'),
( 6,'SKYM2P8VR', 2,11,'7B','PremiumEconomy',1100.00,'Confirmed','2026-04-10 11:45'),
( 7,'SKY9C2L4N', 3, 7,'24F','Economy',      980.00,'Completed','2026-02-22 15:30'),
( 8,'SKY9C2L4P', 3, 8,'24F','Economy',     1020.00,'Completed','2026-02-22 15:30'),
( 9,'SKYE4D8XQ', 4, 1,'8D','PremiumEconomy',1450.00,'Completed','2026-02-18 09:17'),
(10,'SKYE4D8XR', 4, 2,'8D','PremiumEconomy',1480.00,'Completed','2026-02-18 09:17'),
(11,'SKYL5O2BC', 5, 5,'19A','Economy',      420.00,'Cancelled','2026-04-02 13:55'),
(12,'SKYS6F1HN', 6, 9,'31E','Economy',      760.00,'Completed','2026-03-30 21:08'),
(13,'SKYS6F1HP', 6,10,'31E','Economy',      790.00,'CheckedIn','2026-03-30 21:08'),
(14,'SKYY7K3MN', 7,11,'1F','First',        4200.00,'Confirmed','2026-03-12 08:00'),
(15,'SKYY7K3MP', 7,12,'1F','First',        4300.00,'Confirmed','2026-03-12 08:00'),
(16,'SKYM8C5RV', 8, 5,'3A','Business',     1850.00,'Cancelled','2026-04-01 14:22'),
(17,'SKYM8C5RW', 8, 6,'3A','Business',     1820.00,'Completed','2026-04-26 06:00'),
(18,'SKYO9V6JT', 9, 7,'33B','Economy',      980.00,'Completed','2026-03-25 17:45'),
(19,'SKYN1W2QH',10,13,'42K','Economy',      920.00,'Confirmed','2026-04-18 10:11'),
(20,'SKYN1W2QJ',10,14,'42K','Economy',      890.00,'Confirmed','2026-04-18 10:11'),
(21,'SKYI2R3ZX',11, 9,'4C','Business',     3200.00,'Completed','2026-03-08 12:30'),
(22,'SKYI2R3ZY',11,10,'4C','Business',     3250.00,'CheckedIn','2026-03-08 12:30'),
(23,'SKYM3E4PL',12, 7,'38A','Economy',      980.00,'NoShow',   '2026-03-19 22:14'),
(24,'SKYA4H5KD',13, 3,'1B','First',        2200.00,'Completed','2026-02-14 19:00'),
(25,'SKYA4H5KE',13, 4,'1B','First',        2150.00,'Completed','2026-02-14 19:00'),
(26,'SKYA4H5KF',13,15,'1A','First',        2400.00,'Confirmed','2026-04-05 09:00'),
(27,'SKYB5T6QM',14, 1,'29F','Economy',      850.00,'Completed','2026-03-04 16:08'),
(28,'SKYB5T6QN',14, 2,'29F','Economy',      880.00,'Completed','2026-03-04 16:08'),
(29,'SKYC6N7WS',15, 9,'9D','PremiumEconomy',1300.00,'Completed','2026-03-22 11:50'),
(30,'SKYC6N7WT',15,10,'9D','PremiumEconomy',1350.00,'CheckedIn','2026-03-22 11:50'),
(31,'SKYD7Y8XQ',16,13,'5C','Business',     2700.00,'Confirmed','2026-04-15 14:00'),
(32,'SKYD7Y8XR',16,14,'5C','Business',     2650.00,'Confirmed','2026-04-15 14:00'),
(33,'SKYH8Z9LM',17,11,'27A','Economy',      720.00,'Confirmed','2026-04-12 09:33'),
(34,'SKYH8Z9LN',17,12,'27A','Economy',      740.00,'Confirmed','2026-04-12 09:33'),
(35,'SKYIV0A1KE',18, 7,'40C','Economy',     980.00,'Completed','2026-03-28 22:01'),
(36,'SKYL01B2ZP',19,15,'18F','Economy',     340.00,'Confirmed','2026-04-20 13:24'),
(37,'SKYM12C3FT',20, 3,'22B','Economy',     320.00,'Completed','2026-03-30 07:55'),
(38,'SKYM12C3FU',20, 4,'22B','Economy',     310.00,'Completed','2026-03-30 07:55'),
(39,'SKYN23D4GR',21, 7,'2D','Business',    3100.00,'Completed','2026-02-10 12:00'),
(40,'SKYN23D4GS',21, 8,'2D','Business',    3200.00,'Completed','2026-02-10 12:00'),
(41,'SKYN23D4GT',21,13,'2D','Business',    2700.00,'Confirmed','2026-04-08 15:30'),
(42,'SKYO34E5HU',22, 1,'33A','Economy',     850.00,'Completed','2026-03-11 19:42'),
(43,'SKYO34E5HV',22, 2,'33A','Economy',     880.00,'Completed','2026-03-11 19:42'),
(44,'SKYS45F6JV',23, 5,'25D','Economy',     420.00,'Cancelled','2026-04-03 09:18'),
(45,'SKYT56G7KW',24, 7,'10A','PremiumEconomy',1700.00,'Completed','2026-02-27 11:11'),
(46,'SKYT56G7KX',24, 8,'10A','PremiumEconomy',1750.00,'Completed','2026-02-27 11:11'),
(47,'SKYZ67H8LX',25, 9,'30A','Economy',     760.00,'Completed','2026-03-29 08:40'),
(48,'SKYZ67H8LY',25,10,'30A','Economy',     790.00,'CheckedIn','2026-03-29 08:40'),
(49,'SKYAR9P0MT', 1,15,'2B','Business',    2300.00,'Confirmed','2026-04-25 18:00'),
(50,'SKYAK0Q1NV',13,11,'1C','Business',    3400.00,'Confirmed','2026-04-22 10:15');

-- Reset sequences past the seeded IDs
SELECT setval('customers_customer_id_seq', 25, true);
SELECT setval('aircraft_aircraft_id_seq', 5, true);
SELECT setval('flights_flight_id_seq', 15, true);
SELECT setval('bookings_booking_id_seq', 50, true);
