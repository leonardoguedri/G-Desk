import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-criar-chamado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './criar-chamado.html',
  styleUrls: ['./criar-chamado.css']
})
export class CriarChamadoComponent implements OnInit {

  usuarioLogado: any = JSON.parse(localStorage.getItem('usuario') || '{}');
  dataAtual: string = new Date().toLocaleDateString('pt-BR');

  setores: any[] = [];
  instituicoes: any[] = [];
  categorias: any[] = [];
  categoriasFiltradas: any[] = [];

  form = {
    titulo: '',
    descricao: '',
    categoria: '',
    prioridade: 'Normal',
    canal: '',
    instituicao: '',
    unidade: '',
    solicitante_nome: '',
    solicitante_email: '',
    solicitante_telefone: '',
    setor_destino: ''
  };

  sla = { resposta: '', solucao: '' };
  observacoes: any[] = [];
  novaObservacao = '';
  loading = false;
  sucesso = false;
  erro = '';

  constructor(
    private router: Router,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

 async ngOnInit() {
  await Promise.all([
    this.carregarSetores(),
    this.carregarInstituicoes(),
    this.carregarCategorias()
  ]);
  this.categoriasFiltradas = this.categorias;
  this.cdr.detectChanges();
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

 onCategoriaChange(event: Event) {
  const select = event.target as HTMLSelectElement;
  const cat = this.categorias.find((c: any) => c.nome === select.value);
  this.form.categoria = select.value;

  if (cat) {
    this.sla = { resposta: cat.sla_resposta, solucao: cat.sla_solucao };
    // Preenche setor automaticamente se categoria tiver setor vinculado
    if (cat.setor_nome) {
      this.form.setor_destino = cat.setor_nome;
    }
  } else {
    this.sla = { resposta: '', solucao: '' };
  }
}

onSetorChange(event: Event) {
  const select = event.target as HTMLSelectElement;
  this.form.setor_destino = select.value;
  // Filtra categorias do setor selecionado
  const setor = this.setores.find((s: any) => s.nome === select.value);
  if (setor) {
    this.categoriasFiltradas = this.categorias.filter(
      (c: any) => c.setor_id === setor.id || !c.setor_id
    );
  } else {
    this.categoriasFiltradas = this.categorias;
  }
  this.cdr.detectChanges();
}

  enviarObservacao() {
    if (!this.novaObservacao.trim()) return;
    this.observacoes.push({
      usuario: this.usuarioLogado.nome,
      data: new Date().toLocaleString('pt-BR'),
      texto: this.novaObservacao
    });
    this.novaObservacao = '';
  }

  async abrirChamado() {
    if (!this.form.titulo || !this.form.descricao) {
      this.erro = 'Título e descrição são obrigatórios.';
      return;
    }

    this.loading = true;
    this.erro = '';

    try {
      const resultado = await this.api.post('/chamados', {
        ...this.form,
        usuario_id: this.usuarioLogado.id
      });

      if (resultado.id) {
        this.sucesso = true;
        setTimeout(() => this.router.navigate(['/dashboard']), 2000);
      } else {
        this.erro = 'Erro ao criar chamado.';
      }
    } catch (e) {
      this.erro = 'Erro de conexão com o servidor.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  solicitantesBusca: any[] = [];
mostrarSugestoes = false;

async buscarSolicitante(event: any) {
  const termo = event.target.value;
  if (termo.length < 2) {
    this.solicitantesBusca = [];
    return;
  }
  this.solicitantesBusca = await this.api.get(
    `/solicitantes?busca=${encodeURIComponent(termo)}`
  );
  this.mostrarSugestoes = true;
  this.cdr.detectChanges();
}

selecionarSolicitante(s: any) {
  this.form.solicitante_nome = s.nome;
  this.form.solicitante_email = s.email;
  this.form.solicitante_telefone = s.telefone;
  this.form.instituicao = s.instituicao;
  this.form.unidade = s.unidade;
  this.mostrarSugestoes = false;
  this.solicitantesBusca = [];
  this.cdr.detectChanges();
}

}