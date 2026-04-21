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

  novoComentario = '';
  arquivoSelecionado: File | null = null;
  carregando = true;
  erro = '';

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
      this.carregarAnexos(id)
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

  async assumirChamado() {
    const id = this.route.snapshot.params['id'];
    await this.api.put(`/chamados/${id}/assumir`, {
      usuario_id: this.usuarioLogado.id,
      usuario_nome: this.usuarioLogado.nome
    });
    await this.carregarTudo(id);
  }

  async concluirChamado() {
    const id = this.route.snapshot.params['id'];
    await this.api.put(`/chamados/${id}/concluir`, {
      usuario_nome: this.usuarioLogado.nome
    });
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
    return this.chamado?.status === 'Pendente';
  }

  get podeConcluir() {
    return this.chamado?.status === 'Em Execução' &&
           this.chamado?.responsavel_id === this.usuarioLogado.id;
  }

  voltar() {
    this.router.navigate(['/dashboard']);
  }
}