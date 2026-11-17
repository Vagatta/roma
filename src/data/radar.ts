export interface RadarQuestion {
  id: string;
  theme: string;
  prompt: string;
  choices: [string, string, string];
}

export const radarQuestions: RadarQuestion[] = [
  { id: 'fiesta-sorpresa', theme: 'PLAN IMPROVISADO', prompt: 'Os invitan a una fiesta de disfraces con cinco minutos de aviso. ¿Qué haces?', choices: ['Improviso un disfraz con lo que haya', 'Digo que voy de alguien muy específico', 'Voy tal cual y finjo que es conceptual'] },
  { id: 'talento', theme: 'ESCENARIO', prompt: 'Te obligan a actuar en un concurso de talentos improvisado. ¿Qué eliges?', choices: ['Magia sin un solo truco', 'Karaoke sin conocer la letra', 'Una charla motivacional sobre una cuchara'] },
  { id: 'mapa', theme: 'PLANES QUE SE TUERCEN', prompt: 'El mapa os lleva al lugar equivocado. ¿Cuál es tu primer movimiento?', choices: ['Declaro que era el plan desde el principio', 'Busco otro camino en silencio', 'Convierto el error en una parada oficial'] },
  { id: 'villano', theme: 'PERSONAJE', prompt: 'Te ofrecen el papel de villano en una película de presupuesto ridículo. ¿Cuál es tu poder?', choices: ['Cambiar el nombre de las cosas', 'Aparecer siempre en el peor momento', 'Convencer a todos de hacer una fila'] },
  { id: 'restaurante', theme: 'DECISIONES DIFÍCILES', prompt: 'En un restaurante solo queda una mesa, pero tiene una condición. ¿Cuál aceptas?', choices: ['Comer con los ojos vendados', 'Pedir señalando sin mirar el menú', 'Dejar que el camarero elija todo'] },
  { id: 'museo', theme: 'PLAN IMPROVISADO', prompt: 'Un museo os pide explicar una obra que nunca habéis visto. ¿Qué haces?', choices: ['Invento un contexto histórico solemne', 'Describo solo lo que se ve', 'Digo que la obra trata sobre la merienda'] },
  { id: 'isla', theme: 'SUPERVIVENCIA DUDOSA', prompt: 'En una isla desierta solo puedes llevar una de estas cosas. ¿Qué eliges?', choices: ['Una caja de herramientas incompleta', 'Una enciclopedia de plantas', 'Un altavoz que dura ocho horas'] },
  { id: 'robot', theme: 'CIENCIA CASERA', prompt: 'Un robot te sustituye durante un día. ¿Qué instrucción le das primero?', choices: ['Que no prometa nada por mí', 'Que se haga pasar por mí sin explicaciones', 'Que haga todas las tareas pendientes'] },
  { id: 'ascensor', theme: 'TIEMPO MUERTO', prompt: 'Un ascensor se detiene durante veinte minutos. ¿Cómo pasas el rato?', choices: ['Organizo un concurso de nombres de banda', 'Busco cómo salir cuanto antes', 'Pongo banda sonora a la espera'] },
  { id: 'supermercado', theme: 'MISIÓN IMPOSIBLE', prompt: 'Tienes que preparar una cena con tres artículos al azar del supermercado. ¿Cómo eliges?', choices: ['Voy directo a la sección de congelados', 'Cojo lo primero de tres pasillos distintos', 'Busco ingredientes que jamás mezclaría'] },
  { id: 'portada', theme: 'FAMA ACCIDENTAL', prompt: 'Te toca salir en la portada de una revista inventada. ¿Qué titular quieres?', choices: ['La persona que resolvió un problema mínimo', 'Récord mundial de llegar justo a tiempo', 'No sabemos por qué está aquí'] },
  { id: 'nave', theme: 'PRIMER CONTACTO', prompt: 'Aterriza una nave y te piden enseñarles una costumbre humana. ¿Cuál eliges?', choices: ['Hacer una lista de la compra', 'Celebrar un cumpleaños', 'Quejarse del tiempo'] },
  { id: 'casa-rara', theme: 'ARQUITECTURA', prompt: 'Puedes añadir una habitación completamente inútil a tu casa. ¿Cuál?', choices: ['Un pasillo que no lleva a ningún sitio', 'Un museo de objetos perdidos', 'Una sala para ensayar entradas triunfales'] },
  { id: 'mensaje', theme: 'ERROR HUMANO', prompt: 'Envías por accidente un audio absurdo al grupo equivocado. ¿Qué haces?', choices: ['Digo que era una prueba técnica', 'Lo explico inmediatamente', 'Envío otro aún más absurdo'] },
  { id: 'deporte', theme: 'COMPETICIÓN RARA', prompt: 'Inventas un deporte para dos. ¿Con qué regla empieza?', choices: ['Solo se puede jugar andando hacia atrás', 'Cada punto cambia las reglas', 'La persona que pierde elige el trofeo'] },
  { id: 'hotel', theme: 'NOCHE INESPERADA', prompt: 'Tu habitación de hotel tiene un botón sin etiqueta. ¿Qué haces?', choices: ['Lo pulso sin pensarlo', 'Pregunto antes de tocarlo', 'Lo ignoro pero no dejo de mirarlo'] },
  { id: 'subasta', theme: 'GASTOS ABSURDOS', prompt: 'En una subasta te dan dinero ficticio. ¿Por qué objeto pujas fuerte?', choices: ['Un cuadro pintado por un perro', 'Una llave sin cerradura', 'Una taza que no se puede lavar'] },
  { id: 'radio', theme: 'DIRECTO', prompt: 'Te invitan a hablar en la radio sin decirte el tema. ¿Cómo arrancas?', choices: ['Hago una pregunta y gano tiempo', 'Invento una noticia irrelevante', 'Actúo como si fuera mi programa'] },
  { id: 'tour', theme: 'GUÍA SIN GUION', prompt: 'Debes guiar a un grupo por un lugar que no conoces. ¿Cuál es tu estrategia?', choices: ['Convertir cualquier objeto en una leyenda', 'Admitirlo y explorar juntos', 'Pedir al grupo que elija el recorrido'] },
  { id: 'cambio', theme: 'MUNDO AL REVÉS', prompt: 'Por un día, todo el mundo tiene que hablar cantando. ¿Qué haces?', choices: ['Me tomo la norma muy en serio', 'Intento no hablar con nadie', 'Compongo un estribillo para todo'] },
  { id: 'inventor', theme: 'IDEA MILLONARIA', prompt: 'Tienes que vender un invento inútil en treinta segundos. ¿Cuál defiendes?', choices: ['Un paraguas para los zapatos', 'Un reloj que siempre llega tarde', 'Una alarma para encontrar otra alarma'] },
  { id: 'invitado', theme: 'PLAN IMPROVISADO', prompt: 'En una cena te piden contar tu mejor anécdota y no se te ocurre ninguna. ¿Qué haces?', choices: ['Exagero algo que pasó ayer', 'Confieso que mi cabeza está en blanco', 'Pido que alguien me dé tres palabras'] },
  { id: 'montaña', theme: 'DESVÍO', prompt: 'Al llegar a un mirador hay niebla y no se ve nada. ¿Qué propones?', choices: ['Esperar a ver si despeja', 'Hacer fotos a la niebla como si fuera el destino', 'Buscar algo caliente y cambiar de plan'] },
  { id: 'mando', theme: 'PODER INSÓLITO', prompt: 'Encuentras un mando que solo puede controlar una cosa. ¿Qué eliges?', choices: ['El volumen de las conversaciones', 'La velocidad de los semáforos', 'La música que suena al entrar en una habitación'] },
];
