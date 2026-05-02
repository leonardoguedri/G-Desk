import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../auth/auth.service';
import jsPDF from 'jspdf';


@Component({
  selector: 'app-chamado-detalhe',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chamado-detalhe.html',
  styleUrls: ['./chamado-detalhe.css']
})
export class ChamadoDetalheComponent implements OnInit {

  public apiUrl = 'http://localhost:3000';
  usuarioLogado: any = JSON.parse(localStorage.getItem('usuario') || '{}');

  chamado: any = null;
  movimentacoes: any[] = [];
  comentarios: any[] = [];
  anexos: any[] = [];
  setores: any[] = [];
  categoriasPorSetor: any[] = [];

  novoComentario = '';
  arquivoSelecionado: File | null = null;
  carregando = true;
  erro = '';

  // EDIÇÃO DE REDIRECIONAMENTO
  editandoRedirecionamento = false;
  novoSetorDestino = '';
  novaCategoria = '';

  // MODAIS
  mostrarModalConclusao = false;
  mostrarModalRejeicao = false;
  textoConclusao = '';
  motivoRejeicao = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (!id) {
      this.erro = 'ID não encontrado.';
      this.carregando = false;
      return;
    }
    this.carregarTudo(id);
  }

  async carregarTudo(id: string) {
    await Promise.all([
      this.carregarChamado(id),
      this.carregarMovimentacoes(id),
      this.carregarComentarios(id),
      this.carregarAnexos(id),
      this.carregarSetores()
    ]);
    this.carregando = false;
    this.cdr.detectChanges();
  }

  async carregarChamado(id: string) {
    this.chamado = await this.api.get(`/chamados/${id}`);
  }

  async carregarMovimentacoes(id: string) {
    this.movimentacoes = await this.api.get(`/chamados/${id}/movimentacoes`);
  }

  async carregarComentarios(id: string) {
    this.comentarios = await this.api.get(`/chamados/${id}/comentarios`);
  }

  async carregarAnexos(id: string) {
    this.anexos = await this.api.get(`/chamados/${id}/anexos`);
  }

  async carregarSetores() {
    this.setores = await this.api.get('/setores');
  }

  async onSetorChange() {
    const setor = this.setores.find(s => s.nome === this.novoSetorDestino);
    if (setor) {
      const categorias = await this.api.get('/categorias');
      this.categoriasPorSetor = categorias.filter((c: any) => c.setor_id === setor.id);
    } else {
      this.categoriasPorSetor = [];
    }
    this.novaCategoria = '';
    this.cdr.detectChanges();
  }

  iniciarEdicaoRedirecionamento() {
    this.novoSetorDestino = this.chamado.setor_destino;
    this.novaCategoria = this.chamado.categoria;
    this.editandoRedirecionamento = true;
    this.onSetorChange();
  }

  async salvarRedirecionamento() {
    if (!this.novoSetorDestino) return;
    const id = this.route.snapshot.params['id'];
    await this.api.put(`/chamados/${id}/redirecionar`, {
      setor_destino: this.novoSetorDestino,
      categoria: this.novaCategoria,
      usuario_nome: this.usuarioLogado.nome
    });
    this.editandoRedirecionamento = false;
    await this.carregarTudo(id);
  }

  async assumirChamado() {
    const id = this.route.snapshot.params['id'];
    await this.api.put(`/chamados/${id}/assumir`, {
      usuario_id: this.usuarioLogado.id,
      usuario_nome: this.usuarioLogado.nome,
      usuario_email: this.usuarioLogado.email
    });
    await this.carregarTudo(id);
  }

  abrirModalConclusao() {
    this.textoConclusao = '';
    this.mostrarModalConclusao = true;
  }

  abrirModalRejeicao() {
    this.motivoRejeicao = '';
    this.mostrarModalRejeicao = true;
  }

  async confirmarConclusao() {
    if (!this.textoConclusao.trim()) return;
    const id = this.route.snapshot.params['id'];
    await this.api.put(`/chamados/${id}/concluir`, {
      usuario_nome: this.usuarioLogado.nome,
      texto_conclusao: this.textoConclusao
    });
    this.mostrarModalConclusao = false;
    this.textoConclusao = '';
    await this.carregarTudo(id);
  }

  async confirmarRejeicao() {
    if (!this.motivoRejeicao.trim()) return;
    const id = this.route.snapshot.params['id'];
    await this.api.put(`/chamados/${id}/rejeitar`, {
      usuario_nome: this.usuarioLogado.nome,
      motivo_rejeicao: this.motivoRejeicao
    });
    this.mostrarModalRejeicao = false;
    this.motivoRejeicao = '';
    await this.carregarTudo(id);
  }

  async enviarComentario() {
    if (!this.novoComentario.trim()) return;
    const id = this.route.snapshot.params['id'];
    await this.api.post(`/chamados/${id}/comentarios`, {
      usuario_nome: this.usuarioLogado.nome,
      texto: this.novoComentario
    });
    this.novoComentario = '';
    await this.carregarComentarios(id);
    await this.carregarMovimentacoes(id);
    this.cdr.detectChanges();
  }

  onArquivoSelecionado(event: any) {
    this.arquivoSelecionado = event.target.files[0];
  }

  async enviarAnexo() {
    if (!this.arquivoSelecionado) return;
    const id = this.route.snapshot.params['id'];
    const formData = new FormData();
    formData.append('arquivo', this.arquivoSelecionado);
    formData.append('usuario_nome', this.usuarioLogado.nome);
    await this.api.upload(`/chamados/${id}/anexos`, formData);
    this.arquivoSelecionado = null;
    await this.carregarAnexos(id);
    await this.carregarMovimentacoes(id);
    this.cdr.detectChanges();
  }

  get podeAssumir() {
    return this.chamado?.status === 'Pendente' &&
           this.chamado?.setor_destino === this.usuarioLogado.setor;
  }

  get podeConcluir() {
    return this.chamado?.status === 'Em Execução' &&
           this.chamado?.responsavel_id === this.usuarioLogado.id;
  }

  get podeRejeitar() {
    return this.chamado?.status === 'Em Execução' &&
           this.chamado?.responsavel_id === this.usuarioLogado.id;
  }

  get podeRedirecionar() {
    return this.chamado?.setor_destino === this.usuarioLogado.setor &&
           this.chamado?.status !== 'Concluído';
  }

  getTipoClass(tipo: string) {
    const map: any = {
      abertura: 'tipo-abertura',
      assumido: 'tipo-assumido',
      conclusao: 'tipo-conclusao',
      rejeicao: 'tipo-rejeicao',
      comentario: 'tipo-comentario',
      anexo: 'tipo-anexo',
      redirecionamento: 'tipo-redirecionamento'
    };
    return map[tipo] || '';
  }

  voltar() {
    this.router.navigate(['/dashboard']);
  }
  gerarPDF() {
  const doc = new jsPDF();
  const c = this.chamado;
  let y = 20;

  const linha = () => {
    doc.setDrawColor(220, 220, 220);
    doc.line(14, y, 196, y);
    y += 6;
  };

  const titulo = (texto: string) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 95);
    doc.text(texto, 14, y);
    y += 6;
    linha();
  };

  const campo = (label: string, valor: string) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text(label + ':', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(valor || '-', 60, y);
    y += 7;
  };

  // CABEÇALHO
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('G-Desk — Detalhes do Chamado', 14, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, y);
  y += 10;
  linha();

  // DADOS DE ABERTURA
  titulo('DADOS DE ABERTURA');
  campo('Protocolo', c.protocolo);
  campo('Status', c.status);
  campo('Data', c.data_criacao);
  campo('Criado por', c.criador_nome);
  campo('Setor Abertura', c.setor_abertura);
  y += 2;

  // SOLICITANTE
  titulo('SOLICITANTE');
  campo('Nome', c.solicitante_nome);
  campo('Email', c.solicitante_email);
  campo('Telefone', c.solicitante_telefone);
  campo('Instituição', c.instituicao);
  campo('Unidade', c.unidade);
  y += 2;

  // IDENTIFICAÇÃO
  titulo('IDENTIFICAÇÃO DA SOLICITAÇÃO');
  campo('Categoria', c.categoria);
  campo('Prioridade', c.prioridade);
  campo('Setor Destino', c.setor_destino);
  campo('Canal', c.canal);
  campo('Responsável', c.responsavel_nome || 'Não atribuído');
  y += 2;

  // SLA
  titulo('SLA');
  campo('SLA Resposta', c.sla_resposta);
  campo('SLA Solução', c.sla_solucao);
  y += 2;

  // DESCRIÇÃO
  titulo('DESCRIÇÃO');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  const descricaoLinhas = doc.splitTextToSize(c.descricao || '-', 180);
  doc.text(descricaoLinhas, 14, y);
  y += descricaoLinhas.length * 5 + 6;

  // HISTÓRICO
  if (this.movimentacoes.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    titulo('HISTÓRICO DE MOVIMENTAÇÕES');
    for (const m of this.movimentacoes) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(`[${m.tipo.toUpperCase()}] ${m.usuario_nome} — ${m.data}`, 14, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      const linhas = doc.splitTextToSize(m.descricao || '', 180);
      doc.text(linhas, 14, y);
      y += linhas.length * 5 + 4;
    }
    y += 2;
  }

  // COMENTÁRIOS
  if (this.comentarios.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    titulo('COMENTÁRIOS INTERNOS');
    for (const com of this.comentarios) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(`${com.usuario_nome} — ${com.data}`, 14, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      const linhas = doc.splitTextToSize(com.texto || '', 180);
      doc.text(linhas, 14, y);
      y += linhas.length * 5 + 4;
    }
  }

  doc.save(`chamado-${c.protocolo}.pdf`);
}
}
