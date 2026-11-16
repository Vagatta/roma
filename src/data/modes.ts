export const mysteryCase = {
  id: 'cottingley-1917',
  title: 'Las hadas de Cottingley',
  period: 'Cottingley, Yorkshire · 1917–1983',
  intro: 'Dos primas, cinco fotografías y una discusión que duró décadas: ¿eran pruebas de un mundo mágico o una puesta en escena? Investigad el caso con hechos documentados y cerrad vuestro veredicto antes de conocer la confesión.',
  cast: [
    { name: 'Elsie Wright', role: 'La prima mayor; tenía acceso a la cámara de su padre y sabía dibujar.' },
    { name: 'Frances Griffiths', role: 'La prima menor; aparecía en varias de las fotografías.' },
    { name: 'Arthur Conan Doyle', role: 'Autor y defensor público de la autenticidad de las imágenes.' },
    { name: 'Geoffrey Crawley', role: 'Periodista fotográfico que estudió el caso décadas después.' },
  ],
  timeline: [
    { year: '1917', text: 'Elsie y Frances toman sus primeras fotografías junto al arroyo de Cottingley.' },
    { year: '1920', text: 'Edward Gardner y Conan Doyle se interesan por las imágenes; dos se publican en The Strand Magazine.' },
    { year: '1982–83', text: 'Crawley publica su investigación. Elsie escribe para revelar cómo prepararon las figuras.' },
  ],
  leads: [
    { id: 'origin', year: '1917', title: 'La primera fotografía', clue: 'En verano de 1917, Frances decía que jugaba con hadas junto al arroyo de Cottingley. Elsie pidió prestada la cámara de su padre; una de las primeras imágenes muestra a Frances junto a las figuras.', question: '¿Qué información sobre la cámara y la escena todavía no conocemos?' },
    { id: 'publicity', year: '1920', title: 'La fotografía se hace famosa', clue: 'Edward Gardner llevó las imágenes a Arthur Conan Doyle. Doyle aceptó su autenticidad y dos fotografías aparecieron en el número de Navidad de The Strand Magazine en 1920.', question: '¿La reputación de quien valida una imagen confirma cómo se creó?' },
    { id: 'analysis', year: '1982–83', title: 'El archivo vuelve a abrirse', clue: 'El periodista fotográfico Geoffrey Crawley publicó una investigación técnica. El archivo de la Universidad de Leeds reúne copias, negativos, dibujos y cartas vinculados al caso.', question: '¿Qué explicación encaja mejor con el conjunto de pruebas y los materiales conservados?' },
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
