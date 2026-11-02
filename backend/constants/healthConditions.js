/**
 * Maps condition severity to allowed disease labels (validated server-side).
 * Specialty hints drive auto-assignment to doctors.
 */
const DISEASES_BY_CONDITION = {
  critical: [
    { label: 'Cardiac arrest risk', specialtyHint: 'Cardiology' },
    { label: 'Severe trauma', specialtyHint: 'Emergency' },
    { label: 'Stroke symptoms', specialtyHint: 'Neurology' },
    { label: 'Respiratory failure', specialtyHint: 'Pulmonology' }
  ],
  moderate: [
    { label: 'Hypertension', specialtyHint: 'Cardiology' },
    { label: 'Diabetes management', specialtyHint: 'Endocrinology' },
    { label: 'Chronic pain', specialtyHint: 'Pain Management' },
    { label: 'Infection', specialtyHint: 'Internal Medicine' }
  ],
  normal: [
    { label: 'Routine checkup', specialtyHint: 'General' },
    { label: 'Follow-up', specialtyHint: 'General' },
    { label: 'Vaccination', specialtyHint: 'General' },
    { label: 'Minor illness', specialtyHint: 'Internal Medicine' }
  ]
};

function getDiseaseLabels(conditionType) {
  return (DISEASES_BY_CONDITION[conditionType] || []).map((d) => d.label);
}

function findDiseaseMeta(conditionType, diseaseLabel) {
  const list = DISEASES_BY_CONDITION[conditionType] || [];
  return list.find((d) => d.label === diseaseLabel);
}

module.exports = {
  DISEASES_BY_CONDITION,
  getDiseaseLabels,
  findDiseaseMeta
};
