import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracoes.html',
  styleUrls: ['./configuracoes.css']
})
export class ConfiguracoesComponent implements OnInit {

  usuarioLogado: any = JSON.parse(localStorage.getItem('usuario') || '{}');
  abaAtiva = 'usuarios';

  usuarios: any[] = [];
  setores: any[] = [];
  instituicoes: any[] = [];
  categorias: any[] = [];

  novoUsuario = { nome: '', email: '', senha: '', perfil: 'user', setor: '' };
  novoSetor = { nome: '' };
  novaInstituicao = { nome: '', cidade: '' };
  novaCategoria = { nome: '', sla_resposta: '', sla_solucao: '' };

  constructor(
    private router: Router,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (this.usuarioLogado.perfil !== 'admin') {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.carregarTudo();
  }

  async carregarTudo() {
    await Promise.all([
      this.carregarUsuarios(),
      this.carregarSetores(),
      this.carregarInstituicoes(),
      this.carregarCategorias()
    ]);
    this.cdr.detectChanges();
  }

  async carregarUsuarios() {
    this.usuarios = await this.api.get('/usuarios');
  }

  async carregarSetores() {
    this.setores = await this.api.get('/setores');
  }

  async carregarInstituicoes() {
    this.instituicoes = await this.api.get('/instituicoes');
  }

  async carregarCategorias() {
    this.categorias = await this.api.get('/categorias');
  }

  async criarUsuario() {
    if (!this.novoUsuario.nome || !this.novoUsuario.email || !this.novoUsuario.senha) return;
    await this.api.post('/usuarios', this.novoUsuario);
    this.novoUsuario = { nome: '', email: '', senha: '', perfil: 'user', setor: '' };
    await this.carregarUsuarios();
    this.cdr.detectChanges();
  }

  async deletarUsuario(id: number) {
    await this.api.delete(`/usuarios/${id}`);
    await this.carregarUsuarios();
    this.cdr.detectChanges();
  }

  async criarSetor() {
    if (!this.novoSetor.nome) return;
    await this.api.post('/setores', this.novoSetor);
    this.novoSetor = { nome: '' };
    await this.carregarSetores();
    this.cdr.detectChanges();
  }

  async deletarSetor(id: number) {
    await this.api.delete(`/setores/${id}`);
    await this.carregarSetores();
    this.cdr.detectChanges();
  }

  async criarInstituicao() {
    if (!this.novaInstituicao.nome) return;
    await this.api.post('/instituicoes', this.novaInstituicao);
    this.novaInstituicao = { nome: '', cidade: '' };
    await this.carregarInstituicoes();
    this.cdr.detectChanges();
  }

  async deletarInstituicao(id: number) {
    await this.api.delete(`/instituicoes/${id}`);
    await this.carregarInstituicoes();
    this.cdr.detectChanges();
  }

  async criarCategoria() {
    if (!this.novaCategoria.nome) return;
    await this.api.post('/categorias', this.novaCategoria);
    this.novaCategoria = { nome: '', sla_resposta: '', sla_solucao: '' };
    await this.carregarCategorias();
    this.cdr.detectChanges();
  }

  async deletarCategoria(id: number) {
    await this.api.delete(`/categorias/${id}`);
    await this.carregarCategorias();
    this.cdr.detectChanges();
  }

  setAba(aba: string) {
    this.abaAtiva = aba;
  }
}