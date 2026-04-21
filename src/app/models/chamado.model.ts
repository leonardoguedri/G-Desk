export interface Chamado {
  protocolo: string;
  titulo: string;
  descricao: string;
  setor: string;
  solicitante: string;
  executante?: string;
  status: 'pendente' | 'executando' | 'concluido';
  criadoEm: Date;
}
