import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-solicitantes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitantes.html',
  styleUrls: ['./solicitantes.css']
})
export class SolicitantesComponent implements OnInit {

  solicitantes: any[] = [];
  busca = '';
  editando: any = null;
  mostrarForm = false;

  novo = {
    nome: '', email: '', telefone: '',
    instituicao: '', unidade: '', observacoes: ''
  };

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    await this.carregar();
  }

  async carregar() {
    this.solicitantes = await this.api.get('/solicitantes');
    this.cdr.detectChanges();
  }

  async pesquisar() {
    if (this.busca.trim()) {
      this.solicitantes = await this.api.get(`/solicitantes?busca=${encodeURIComponent(this.busca)}`);
    } else {
      await this.carregar();
    }
    this.cdr.detectChanges();
  }

  async criar() {
    if (!this.novo.nome) return;
    await this.api.post('/solicitantes', this.novo);
    this.novo = { nome: '', email: '', telefone: '', instituicao: '', unidade: '', observacoes: '' };
    this.mostrarForm = false;
    await this.carregar();
  }

  editar(s: any) {
    this.editando = { ...s };
  }

  async salvar() {
    if (!this.editando) return;
    await this.api.put(`/solicitantes/${this.editando.id}`, this.editando);
    this.editando = null;
    await this.carregar();
  }

  async deletar(id: number) {
    await this.api.delete(`/solicitantes/${id}`);
    await this.carregar();
  }
}