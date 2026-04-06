export const triageQuestions = {
  cardiac: {
    question: 'Is the patient experiencing chest pain or pressure?',
    options: [
      { text: 'Severe crushing chest pain, sweating, arm pain', severity: 'critical' },
      { text: 'Mild chest discomfort, shortness of breath', severity: 'moderate' },
      { text: 'Feeling unwell, mild palpitations only', severity: 'low' },
    ],
  },
  neurological: {
    question: 'What is the patient\'s level of consciousness?',
    options: [
      { text: 'Unconscious or unable to speak at all', severity: 'critical' },
      { text: 'Conscious but confused, slurred speech', severity: 'moderate' },
      { text: 'Fully conscious, mild headache or dizziness', severity: 'low' },
    ],
  },
  trauma: {
    question: 'Severity of injury and bleeding?',
    options: [
      { text: 'Heavy uncontrolled bleeding or unconscious', severity: 'critical' },
      { text: 'Moderate bleeding, conscious and responsive', severity: 'moderate' },
      { text: 'Minor cuts or bruises, fully alert', severity: 'low' },
    ],
  },
  toxicological: {
    question: 'What was the exposure / ingestion?',
    options: [
      { text: 'Snake bite, chemical poisoning, or unconscious', severity: 'critical' },
      { text: 'Medication overdose, conscious and stable', severity: 'moderate' },
      { text: 'Mild food poisoning, alert and drinking water', severity: 'low' },
    ],
  },
  respiratory: {
    question: 'How is the patient breathing?',
    options: [
      { text: 'Severe difficulty, lips turning blue, gasping', severity: 'critical' },
      { text: 'Rapid breathing, mild wheezing, anxious', severity: 'moderate' },
      { text: 'Mild shortness of breath, speaking normally', severity: 'low' },
    ],
  },
  general: {
    question: 'Overall patient condition?',
    options: [
      { text: 'Unresponsive, very pale, or no pulse detectable', severity: 'critical' },
      { text: 'In significant pain, conscious and responding', severity: 'moderate' },
      { text: 'Alert, some discomfort but stable', severity: 'low' },
    ],
  },
}
