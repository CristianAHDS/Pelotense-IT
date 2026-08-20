export const CATEGORIAS_POR_TIPO = {
  TI: [
    { value: 'geral', label: 'Geral' },
    { value: 'hardware', label: 'Hardware' },
    { value: 'software', label: 'Software' },
    { value: 'rede', label: 'Rede' },
    { value: 'impressora', label: 'Impressora' },
    { value: 'email', label: 'E-mail' },
    { value: 'acesso', label: 'Acesso' },
    { value: 'evento', label: 'Evento' },
    { value: 'censura', label: 'Censura' },
  ],
  audiovisual: [
    { value: 'gravacao', label: 'Gravação' },
    { value: 'edicao', label: 'Edição' },
    { value: 'postagem', label: 'Postagem' },
    { value: 'operacao', label: 'Operação' },
  ],
  radio: [
    { value: 'gravacao', label: 'Gravação' },
    { value: 'transmissao', label: 'Transmissão' },
    { value: 'operacao', label: 'Operação' },
    { value: 'sonorizacao', label: 'Sonorização' },
  ],
};

export const categoriasParaTipo = (tipo) =>
  CATEGORIAS_POR_TIPO[tipo] || CATEGORIAS_POR_TIPO.TI;
