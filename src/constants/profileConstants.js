export const GENDER_OPTIONS = ['Man', 'Woman', 'Non Binary'];

export const LIFESTYLE_OPTIONS = {
  YES_NO: ['Yes', 'Sometimes', 'No', 'Prefer Not to say'],
  POLITICAL: [
    'Liberal',
    'Moderate',
    'Conservative',
    'Not Political',
    'Prefer not to say',
  ],
  RELIGIOUS: [
    'Agnostic',
    'Atheist',
    'Buddhist',
    'Catholic',
    'Christian',
    'Hindu',
    'Jewish',
    'Muslim',
    'Spiritual',
    'Other',
    'Prefer not to say',
  ],
};

export const PERSONAL_DETAILS_OPTIONS = {
  FAMILY_PLANS: [
    "Don't want children",
    'Want children',
    'Not sure yet',
    'Prefer not to say',
  ],
  HAS_CHILDREN: [
    "Don't have children",
    'Have Children',
    'Prefer not to say',
  ],
  ETHNICITY: [
    'Black/African Descent',
    'East Asian',
    'Hispanic/Latino',
    'Middle Eastern',
    'Native American',
    'Pacific Islander',
    'South Asian',
    'Southeast Asian',
    'White/Caucasian',
    'Prefer not to say',
  ],
  EDUCATION_LEVEL: [
    'High School',
    'Undergrad',
    'Postgrad',
    'Prefer not to say',
  ],
  HEIGHT: Array.from({length: 24}, (_, i) => {
    const feet = Math.floor((60 + i) / 12);
    const inches = (60 + i) % 12;
    return `${feet}'${inches}"`;
  }),
};

export const DATING_PREFERENCES_OPTIONS = {
  WHO_TO_DATE: ['Men', 'Women', 'Nonbinary People', 'Everyone'],
  INTENTION: [
    'Long-term Relationship',
    'Short-term relationship, open to short long-term',
    'Short-term relationship',
    'Figuring out my dating goals',
    'Prefer not to say',
  ],
  RELATIONSHIP_TYPE: ['Monogamy', 'Non-Monogamy'],
};

export const PROMPT_CATEGORIES = {
  aboutMe: {
    title: 'About me',
    prompts: [
      'Unusual Skills',
      'My most irrational fear',
      'This year, I really want to',
      'I go crazy for',
      'A little goal of mine',
      'My random superpower',
      'A random fact I love is',
      'The way to win me over is',
      'My ideal first date',
      'Typical Sunday',
    ],
  },
  selfCare: {
    title: 'Self Care',
    prompts: [
      'When I need advice, I go to',
      'My last journal entry was about',
      'I get myself out of',
      'My self-care routine is',
      'My therapist would say I',
      'My cry-it-all-out song is',
      'The best thing I have ever done is',
      'A boundary of mine is',
      'Therapy recently taught me',
      'I wind down by',
    ],
  },
  gettingPersonal: {
    title: 'Getting personal',
    prompts: [
      "Don't invite me if",
      'When I hold you, that',
      'I never shut up about',
      'You should not go out with me if',
      'The one thing you should know about me is',
      'My love language is',
      'The key to my heart is',
      'I geek out on',
      "If loving is wrong, I don't want to be right",
    ],
  },
};
