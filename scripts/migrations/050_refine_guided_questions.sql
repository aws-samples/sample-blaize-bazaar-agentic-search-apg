-- Migration 050: refine required shopper questions without changing their contracts.
-- Update only known authored prompts; preserve participant-authored variations.
\set ON_ERROR_STOP on

BEGIN;

UPDATE pellier.workshop_scenarios
   SET prompt = 'What would go with the Hadley Linen Shirt?'
 WHERE persona_id = 'marco' AND ordinal = 2
   AND journey_role = 'required' AND prompt = 'What would go with the Hadley shirt?';

UPDATE pellier.workshop_scenarios
   SET prompt = 'How many Hadley Linen Shirts are available at the Brooklyn warehouse, and what ship window is recorded?'
 WHERE persona_id = 'marco' AND ordinal = 3
   AND journey_role = 'required' AND prompt = 'Is the Hadley shirt at the Brooklyn warehouse, and can it still ship in time?';

UPDATE pellier.workshop_scenarios
   SET prompt = 'A housewarming gift for someone who loves slow morning rituals.'
 WHERE persona_id = 'anna' AND ordinal = 1
   AND journey_role = 'required' AND prompt = 'A thoughtful gift for someone who loves morning rituals';

UPDATE pellier.workshop_scenarios
   SET prompt = 'Keep it under $100 and in stock. Show me the strongest two options.'
 WHERE persona_id = 'anna' AND ordinal = 2
   AND journey_role = 'required' AND prompt = 'Keep the gift under $100 and show me the strongest two options.';

UPDATE pellier.workshop_scenarios
   SET prompt = 'Which one should I choose? Compare the two options using their current prices and availability.'
 WHERE persona_id = 'anna' AND ordinal = 3
   AND journey_role = 'required' AND prompt = 'Which one should I choose, and prove it stayed in budget and in stock?';

UPDATE pellier.workshop_scenarios
   SET prompt = 'What goes well with the pour-over set, keeping to the same materials and morning routine?'
 WHERE persona_id = 'theo' AND ordinal = 2
   AND journey_role = 'required' AND prompt = 'What goes well with the pour-over set?';

COMMIT;
