interface PlaceStory {
  prompt: string;
  choices: [{ title: string; action: string }, { title: string; action: string }];
}

const stories: Record<string, PlaceStory> = {
  colosseum: { prompt: 'Si este lugar tuviera que anunciar un espectáculo hoy, ¿cuál sería?', choices: [{ title: 'El cartel', action: 'Inventad el nombre del espectáculo y fotografiad su cartel imaginario en vuestra memoria.' }, { title: 'La grada', action: 'Elegid a qué dos personas invitaríais y qué pasaría al empezar.' }] },
  trevi: { prompt: 'Olvidad los deseos de siempre. ¿Qué historia esconde el agua?', choices: [{ title: 'Un secreto', action: 'Buscad un detalle que parezca una pista y dadle un nombre.' }, { title: 'Un rumor', action: 'Inventad en una frase el rumor más absurdo sobre la fuente.' }] },
  pantheon: { prompt: 'El óculo deja entrar el cielo. ¿Qué investigaríais primero?', choices: [{ title: 'La luz', action: 'Localizad dónde cae la luz y describid qué iluminaría dentro de una hora.' }, { title: 'El eco', action: 'Imaginad un mensaje de cinco palabras que resonaría aquí.' }] },
  navona: { prompt: 'La plaza es un escenario. Elegid vuestra escena.', choices: [{ title: 'Personaje', action: 'Escoged una fuente como protagonista e inventad su gran problema.' }, { title: 'Decorado', action: 'Buscad un ángulo que cambie por completo el aspecto de la plaza.' }] },
  trastevere: { prompt: 'Dos calles y dos historias posibles. ¿Cuál os quedáis?', choices: [{ title: 'Desvío', action: 'Buscad una esquina que os haga cambiar de dirección y ponedle nombre.' }, { title: 'Personaje', action: 'Inventad el oficio imposible de alguien que viviría en este barrio.' }] },
  angelo: { prompt: 'Los ángeles del puente parecen custodiar algo.', choices: [{ title: 'El guardián', action: 'Elegid una figura e inventad qué objeto protege.' }, { title: 'La fuga', action: 'Señalad el mejor punto para empezar una persecución de película y contad por qué.' }] },
  steps: { prompt: 'Hay muchas formas de mirar la escalinata. ¿Cuál elegís?', choices: [{ title: 'Desde abajo', action: 'Buscad el detalle que solo se ve al empezar la subida.' }, { title: 'Desde arriba', action: 'Describid la vista como si fuera el inicio de una película.' }] },
  keyhole: { prompt: 'Una cerradura puede esconder algo más que una vista.', choices: [{ title: 'La pista', action: 'Contad qué elemento se ve primero y por qué parece colocado ahí.' }, { title: 'La historia', action: 'Inventad qué habría al otro lado si esa puerta se abriera.' }] },
  forum: { prompt: 'Las ruinas no cuentan todo. ¿Qué os gustaría recuperar?', choices: [{ title: 'Una voz', action: 'Elegid un personaje imaginario y decidid qué estaría discutiendo aquí.' }, { title: 'Un objeto', action: 'Señalad algo pequeño que podría haber sobrevivido hasta hoy.' }] },
  borghese: { prompt: 'El parque tiene espacio para un descubrimiento absurdo.', choices: [{ title: 'Expedición', action: 'Buscad un árbol o un sendero con un rasgo raro y bautizadlo.' }, { title: 'Exposición', action: 'Elegid un rincón y decidid qué obra imposible exhibiríais allí.' }] },
  popolo: { prompt: 'Esta plaza parece la puerta de entrada a otra ciudad.', choices: [{ title: 'La entrada', action: 'Elegid una dirección y contad qué esperáis encontrar al seguirla.' }, { title: 'El anuncio', action: 'Inventad el eslogan de la ciudad a partir de un detalle de la plaza.' }] },
  castle: { prompt: 'La fortaleza cambia de función según quién la mire.', choices: [{ title: 'Defensa', action: 'Encontrad un punto que parezca imposible de conquistar y explicad por qué.' }, { title: 'Escape', action: 'Inventad una salida secreta que encaje con la silueta del castillo.' }] },
  vatican: { prompt: 'La escala de la plaza juega con la vista.', choices: [{ title: 'Perspectiva', action: 'Buscad un punto desde el que las columnas parezcan alinearse.' }, { title: 'Proporción', action: 'Elegid un detalle pequeño frente a la cúpula y describid el contraste.' }] },
  campo: { prompt: 'Un mercado puede esconder la mejor historia del día.', choices: [{ title: 'El puesto', action: 'Elegid un producto visible y decidid qué personaje lo compraría.' }, { title: 'El rumor', action: 'Inventad una noticia insólita que podría circular por la plaza.' }] },
  isola: { prompt: 'La isla tiene forma de barco. ¿Adónde iría?', choices: [{ title: 'Rumbo', action: 'Elegid uno de los puentes como salida e inventad el destino del viaje.' }, { title: 'Tripulación', action: 'Decidid qué dos personajes insólitos gobernarían el barco.' }] },
  gianicolo: { prompt: 'Desde arriba, la ciudad parece un mapa de pistas.', choices: [{ title: 'La pista', action: 'Señalad un punto del horizonte y decidid qué historia investigaríais allí.' }, { title: 'La portada', action: 'Poned título a la vista como si fuera la portada de un libro.' }] },
  aranci: { prompt: 'Un jardín con vistas pide una teoría propia.', choices: [{ title: 'El árbol', action: 'Elegid una sombra o un árbol y contad qué secreto podría esconder.' }, { title: 'El horizonte', action: 'Buscad una forma reconocible en la vista y ponedle un nombre nuevo.' }] },
  testaccio: { prompt: 'Este barrio mezcla recetas, mercado y calles.', choices: [{ title: 'Menú', action: 'Inventad un plato imposible inspirado en algo que hayáis visto.' }, { title: 'Crónica', action: 'Buscad un detalle de la calle que merezca un titular de periódico.' }] },
  circo: { prompt: 'Imaginad el ruido de una carrera donde ahora hay espacio abierto.', choices: [{ title: 'La carrera', action: 'Inventad dos competidores actuales y decidid quién ganaría.' }, { title: 'La huella', action: 'Buscad una línea o curva en el terreno y decidid qué rastro deja.' }] },
  monti: { prompt: 'En este barrio, cada esquina podría ser un escenario.', choices: [{ title: 'La escena', action: 'Elegid un rincón y escribid la primera frase de una película ambientada allí.' }, { title: 'El objeto', action: 'Señalad algo en un escaparate o fachada y contad a quién pertenecería.' }] },
  venezia: { prompt: 'Aquí compiten el tráfico y la arquitectura.', choices: [{ title: 'El sonido', action: 'Describid el contraste entre lo que veis y lo que oís en cinco palabras.' }, { title: 'El gigante', action: 'Poned un apodo al monumento basándoos en su silueta.' }] },
  caracalla: { prompt: 'Estas termas gigantes piden un uso inesperado.', choices: [{ title: 'Reinvención', action: 'Inventad una actividad moderna que encajaría en este lugar.' }, { title: 'La escala', action: 'Elegid una forma de explicar su tamaño sin usar números.' }] },
  bocca: { prompt: 'La leyenda dice que la máscara descubre mentiras.', choices: [{ title: 'La pregunta', action: 'Inventad una pregunta absurda que la máscara debería hacer a todos.' }, { title: 'El juicio', action: 'Contad qué mentira completamente inofensiva detectaría primero.' }] },
  'torre-argentina': { prompt: 'Entre ruinas y gatos, ¿a quién le daríais el mando?', choices: [{ title: 'Los gatos', action: 'Inventad el título del gato que gobernaría estas ruinas.' }, { title: 'Las piedras', action: 'Elegid una ruina y contad qué habría visto desde allí.' }] },
  campidoglio: { prompt: 'El diseño de la plaza parece esconder un código.', choices: [{ title: 'El suelo', action: 'Buscad una forma repetida en el pavimento y dadle un significado secreto.' }, { title: 'La colina', action: 'Elegid desde dónde contaríais la historia de esta plaza y por qué.' }] },
  'santa-maria-maggiore': { prompt: 'El color y los mosaicos sugieren otra lectura.', choices: [{ title: 'El color', action: 'Elegid un tono visible e inventad el nombre de un pigmento nuevo.' }, { title: 'El detalle', action: 'Buscad un motivo decorativo y contad qué representa para vosotros.' }] },
  'san-clemente': { prompt: 'Aquí la historia está hecha de capas.', choices: [{ title: 'Excavación', action: 'Decidid qué objeto inesperado querríais encontrar bajo vuestros pies.' }, { title: 'Superposición', action: 'Contad qué dos épocas parecen convivir en lo que podéis ver.' }] },
  piramide: { prompt: 'Una pirámide en Roma exige una explicación alternativa.', choices: [{ title: 'Teoría seria', action: 'Construid una teoría creíble en una sola frase.' }, { title: 'Teoría imposible', action: 'Inventad la explicación menos probable que se os ocurra.' }] },
  repubblica: { prompt: 'La curva de la plaza esconde unas termas antiguas.', choices: [{ title: 'Plano secreto', action: 'Seguid la curva con la mirada e imaginad dónde estaría la entrada perdida.' }, { title: 'Antes y ahora', action: 'Señalad un contraste entre lo antiguo y lo moderno y ponedle título.' }] },
};

export function storyForPlace(placeId: string, placeName: string): PlaceStory {
  return stories[placeId] ?? {
    prompt: `Habéis llegado a ${placeName}. ¿Qué os lleváis de esta parada?`,
    choices: [
      { title: 'El detalle', action: 'Buscad algo pequeño que no aparezca en la foto principal y contad por qué os llamó la atención.' },
      { title: 'La historia', action: 'Inventad un titular absurdo para este lugar y guardadlo como recuerdo.' },
    ],
  };
}
