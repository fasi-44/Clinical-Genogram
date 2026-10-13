import { Gender, GenogramData, IntakeChild, IntakeForm, IntakePartner, IntakeRelative } from '../types';
import { buildGenogramFromIntake } from './KinshipBuilder';

/**
 * Ready-made family structures clinicians start from most often. Each one is
 * a set of questionnaire answers with role labels as names ("Father",
 * "Paternal grandmother", ...), built by the same KinshipBuilder as the
 * questionnaire, so the result can be renamed on the board or opened in the
 * questionnaire (Generate) for editing.
 */
export interface GenogramTemplate {
  id: string;
  name: string;
  /** One line for the menu, naming the partner as wife or husband */
  description(patientGender: Gender): string;
  /** Questionnaire answers for the given patient gender */
  intake(patientGender: Gender): IntakeForm;
}

const person = (fullName: string, gender: Gender): IntakeRelative => ({ fullName, gender, status: 'alive' });

const patient = (gender: Gender) => person('Patient', gender);
const father = () => person('Father', 'male');
const mother = () => person('Mother', 'female');

const grandparents = () => ({
  paternalGrandfather: person('Paternal grandfather', 'male'),
  paternalGrandmother: person('Paternal grandmother', 'female'),
  maternalGrandfather: person('Maternal grandfather', 'male'),
  maternalGrandmother: person('Maternal grandmother', 'female'),
});

const siblings = () => [person('Brother', 'male'), person('Sister', 'female')];

/** Wife for a male patient, husband for a female one, partner otherwise */
const partnerLabel = (patientGender: Gender) => (patientGender === 'male' ? 'Wife' : patientGender === 'female' ? 'Husband' : 'Partner');

function partner(patientGender: Gender, children: IntakeChild[] = []): IntakePartner {
  const gender: Gender = patientGender === 'male' ? 'female' : patientGender === 'female' ? 'male' : 'unknown';
  return { ...person(partnerLabel(patientGender), gender), relationshipType: 'marriage', consanguinity: 'none', children };
}

const children = (): IntakeChild[] => [person('Son', 'male'), person('Daughter', 'female')];

export const GENOGRAM_TEMPLATES: GenogramTemplate[] = [
  {
    id: 'couple',
    name: 'Patient & partner',
    description: g => `Patient and ${partnerLabel(g).toLowerCase()}`,
    intake: g => ({ patient: patient(g), partners: [partner(g)] }),
  },
  {
    id: 'parents',
    name: 'Patient & parents',
    description: () => 'Patient, father and mother',
    intake: g => ({ patient: patient(g), father: father(), mother: mother() }),
  },
  {
    id: 'grandparents',
    name: 'Patient, parents & grandparents',
    description: () => 'Three generations, with both sets of grandparents',
    intake: g => ({ patient: patient(g), father: father(), mother: mother(), grandparents: grandparents() }),
  },
  {
    id: 'own-family',
    name: "Patient's own family",
    description: g => `Patient, ${partnerLabel(g).toLowerCase()}, a son and a daughter`,
    intake: g => ({ patient: patient(g), partners: [partner(g, children())] }),
  },
  {
    id: 'three-generations',
    name: 'Standard 3-generation',
    description: g => `Grandparents, parents, siblings, ${partnerLabel(g).toLowerCase()} and children`,
    intake: g => ({
      patient: patient(g),
      father: father(),
      mother: mother(),
      grandparents: grandparents(),
      siblings: siblings(),
      partners: [partner(g, children())],
    }),
  },
];

/** Builds a template's genogram (unpositioned; run the layout afterwards). */
export function buildTemplate(id: string, patientGender: Gender = 'male'): GenogramData {
  const template = GENOGRAM_TEMPLATES.find(t => t.id === id);
  if (!template) throw new Error(`Unknown genogram template: ${id}`);
  const data = buildGenogramFromIntake(template.intake(patientGender));
  data.metadata = { ...data.metadata, title: template.name };
  return data;
}
