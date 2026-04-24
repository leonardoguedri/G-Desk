import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../auth/auth.service';

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
}