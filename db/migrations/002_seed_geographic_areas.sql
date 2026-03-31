-- Migration 002: Seed geographic areas with Mexico's 32 states + national level
-- Uses official INEGI 2-digit codes. Lat/lng approximate state capital coordinates.
-- Run: psql $DATABASE_URL -f db/migrations/002_seed_geographic_areas.sql

BEGIN;

-- National level (must be inserted first as parent)
INSERT INTO geographic_areas (code, name, level, parent_code, lat, lng) VALUES
    ('00', 'Nacional', 'national', NULL, 23.6345, -102.5528)
ON CONFLICT (code) DO NOTHING;

-- 32 states with approximate capital coordinates
INSERT INTO geographic_areas (code, name, level, parent_code, lat, lng) VALUES
    ('01', 'Aguascalientes',                   'state', '00', 21.8818, -102.2916),
    ('02', 'Baja California',                  'state', '00', 32.6245, -115.4523),
    ('03', 'Baja California Sur',              'state', '00', 24.1426, -110.3128),
    ('04', 'Campeche',                         'state', '00', 19.8301, -90.5349),
    ('05', 'Coahuila de Zaragoza',             'state', '00', 25.4232, -100.9922),
    ('06', 'Colima',                           'state', '00', 19.2433, -103.7250),
    ('07', 'Chiapas',                          'state', '00', 16.7370, -93.1290),
    ('08', 'Chihuahua',                        'state', '00', 28.6353, -106.0889),
    ('09', 'Ciudad de México',                 'state', '00', 19.4326, -99.1332),
    ('10', 'Durango',                          'state', '00', 24.0277, -104.6532),
    ('11', 'Guanajuato',                       'state', '00', 21.0190, -101.2574),
    ('12', 'Guerrero',                         'state', '00', 17.5519, -99.5063),
    ('13', 'Hidalgo',                          'state', '00', 20.0911, -98.7624),
    ('14', 'Jalisco',                          'state', '00', 20.6597, -103.3496),
    ('15', 'México',                           'state', '00', 19.2938, -99.6568),
    ('16', 'Michoacán de Ocampo',              'state', '00', 19.7010, -101.1844),
    ('17', 'Morelos',                          'state', '00', 18.9242, -99.2216),
    ('18', 'Nayarit',                          'state', '00', 21.5085, -104.8946),
    ('19', 'Nuevo León',                       'state', '00', 25.6866, -100.3161),
    ('20', 'Oaxaca',                           'state', '00', 17.0732, -96.7266),
    ('21', 'Puebla',                           'state', '00', 19.0414, -98.2063),
    ('22', 'Querétaro',                        'state', '00', 20.5888, -100.3899),
    ('23', 'Quintana Roo',                     'state', '00', 18.5001, -88.2961),
    ('24', 'San Luis Potosí',                  'state', '00', 22.1565, -100.9855),
    ('25', 'Sinaloa',                          'state', '00', 24.8049, -107.3940),
    ('26', 'Sonora',                           'state', '00', 29.0729, -110.9559),
    ('27', 'Tabasco',                          'state', '00', 17.9869, -92.9303),
    ('28', 'Tamaulipas',                       'state', '00', 23.7369, -99.1411),
    ('29', 'Tlaxcala',                         'state', '00', 19.3182, -98.2375),
    ('30', 'Veracruz de Ignacio de la Llave',  'state', '00', 19.1738, -96.1342),
    ('31', 'Yucatán',                          'state', '00', 20.9674, -89.6245),
    ('32', 'Zacatecas',                        'state', '00', 22.7709, -102.5832)
ON CONFLICT (code) DO NOTHING;

COMMIT;
