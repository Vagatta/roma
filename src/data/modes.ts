export type MysteryLeadKind = 'circunstancia' | 'testimonio' | 'analisis';

export const mysteryCase = {
  id: 'cottingley-1917',
  title: 'Las hadas de Cottingley',
  period: 'Cottingley, Yorkshire · 1917–1983',
  intro: 'Dos primas, cinco fotografías y una discusión que duró décadas: ¿eran pruebas de un mundo mágico o una puesta en escena? Separad lo que es testimonio de lo que es evidencia material, revelad las pistas por turnos y cerrad vuestro veredicto antes de conocer la confesión.',
  cast: [
    { name: 'Elsie Wright', role: 'La prima mayor; sabía dibujar y tenía acceso a la cámara de su padre.' },
    { name: 'Frances Griffiths', role: 'La prima menor; aparecía en varias de las fotografías.' },
    { name: 'Edward Gardner', role: 'Espiritualista que llevó las imágenes a Arthur Conan Doyle.' },
    { name: 'Arthur Conan Doyle', role: 'Autor y defensor público de la autenticidad de las imágenes.' },
    { name: 'Geoffrey Crawley', role: 'Periodista fotográfico que estudió el caso décadas después.' },
  ],
  timeline: [
    { year: '1917', text: 'Elsie y Frances toman sus primeras fotografías junto al arroyo de Cottingley.' },
    { year: '1919', text: 'Edward Gardner, interesado en el más allá, muestra las imágenes a Arthur Conan Doyle.' },
    { year: '1920', text: 'Doyle acepta su autenticidad y dos fotografías aparecen en The Strand Magazine.' },
    { year: '1966', text: 'Un periodista entrevista a Elsie; admite la broma y luego se retracta.' },
    { year: '1983', text: 'Elsie escribe a Crawley confirmando que las hadas eran dibujos de papel sujetos con alfileres.' },
  ],
  leads: [
    {
      id: 'escena', year: '1917', kind: 'circunstancia' as const, title: 'La escena preparada',
      clue: 'En verano de 1917, Frances decía que jugaba con hadas junto al arroyo. Elsie pidió prestada la cámara de placas de su padre —una Midg que no era suya— y compuso la escena ella misma.',
      question: '¿Quién controlaba la cámara y la puesta en escena?',
      against: ['genuine'],
    },
    {
      id: 'camara', year: '1917', kind: 'circunstancia' as const, title: 'La Midg del padre',
      clue: 'La cámara era de placas de gran formato con un solo objetivo. Podía hacer doble exposición, pero las figuras aparecen con bordes cortados, sombras duras y sin la profundidad de una toma única.',
      question: '¿Los defectos de las imágenes delatan manipulación física o solo trucos de laboratorio?',
      against: ['darkroom', 'genuine'],
    },
    {
      id: 'dibujo', year: '1917', kind: 'circunstancia' as const, title: 'La mano de Elsie',
      clue: 'Elsie era una dibujante consumada. Las "hadas" tienen el trazo plano, las alas simétricas y la iluminación idealizada propios de una ilustración, no de una captura fortuita.',
      question: '¿El estilo de las figuras coincide con una cámara o con un pincel?',
      against: ['genuine', 'darkroom'],
    },
    {
      id: 'pueblo', year: '1917', kind: 'circunstancia' as const, title: 'Un pueblo de hadas',
      clue: 'Cottingley era una aldea conocida por su tradición de tallas en madera, sus cuentos de duendes y su afición a los juegos de rol ilustrados. Los niños del lugar crecieron rodeados de esa imaginería.',
      question: '¿Qué papel jugó el entorno cultural en la invención de la historia?',
      against: ['genuine'],
    },
    {
      id: 'publicidad', year: '1919–1920', kind: 'testimonio' as const, title: 'El prestigio de Doyle',
      clue: 'Edward Gardner, espiritualista convencido, llevó las fotos a Arthur Conan Doyle, ya célebre por Sherlock Holmes. Doyle defendió su autenticidad y las publicitó en The Strand Magazine.',
      question: '¿La reputación de quien valida una imagen es una prueba de cómo se creó?',
      against: [],
    },
    {
      id: 'analisis', year: '1982', kind: 'analisis' as const, title: 'El informe de Crawley',
      clue: 'El periodista Geoffrey Crawley estudió negativos y copias en el archivo de la Universidad de Leeds: las figuras tienen borde de papel recortado, están sujetas con alfileres y no proyectan la sombra coherente de un ser tridimensional.',
      question: '¿Qué explica mejor los materiales conservados?',
      against: ['genuine', 'darkroom'],
    },
    {
      id: 'confesion', year: '1966–1983', kind: 'testimonio' as const, title: 'La admisión y la retractación',
      clue: 'En 1966 un periodista del News of the World entrevistó a Elsie, que admitió la broma de los recortes; días después se retractó. En 1983 escribió a Crawley confirmando que las hadas eran dibujos de papel con alfileres.',
      question: '¿Por qué una confesión posterior desmiente una retractación anterior?',
      against: ['genuine', 'darkroom'],
    },
  ],
  verdicts: [
    { id: 'genuine', title: 'Las fotografías captaron hadas reales.' },
    { id: 'composite', title: 'Las figuras eran recortes dibujados y colocados para la cámara.' },
    { id: 'darkroom', title: 'Las figuras se añadieron después mediante doble exposición en el laboratorio.' },
  ],
  answer: 'composite',
  reveal: 'En una carta de 1983 a Crawley, Elsie explicó que las hadas eran dibujos de papel sujetos con alfileres para las fotografías. Elsie describió la puesta en escena como una broma; la historia se mantuvo durante décadas. Es un engaño fotográfico histórico, no un crimen.',
  sources: [
    { label: 'National Science and Media Museum: historia y confesión', url: 'https://blog.scienceandmediamuseum.org.uk/the-story-of-the-cottingley-fairies-shows-that-image-manipulation-is-nothing-new/' },
    { label: 'University of Leeds: archivo de Cottingley', url: 'https://explore.library.leeds.ac.uk/special-collections-explore/8705' },
    { label: 'University of Leeds: historia de las fotografías', url: 'https://library.leeds.ac.uk/news/article/1000/library/132/fooled-by-fairies' },
  ],
};
