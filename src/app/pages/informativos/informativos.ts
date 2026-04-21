import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-informativos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './informativos.html',
  styleUrls: ['./informativos.css']
})
export class InformativosComponent {

  // DESTINO
  regiaoSelecionada = '';
  clienteSelecionado = '';
  setorSelecionado = '';

  // CONTEÚDO
  assunto = '';
  titulo = '';
  mensagem = '';

  dataAtual = new Date();

  regioes = ['Belém', 'Ananindeua', 'Castanhal'];

  clientesPorRegiao: any = {
    'Belém': ['PRODEPA', 'SEDUC', 'DETRAN']
  };

  setoresProdepa = ['Redes', 'Suporte', 'Desenvolvimento'];

  get clientes() {
    return this.clientesPorRegiao[this.regiaoSelecionada] || [];
  }

  get mostrarClientes() {
    return !!this.regiaoSelecionada;
  }

  get mostrarSetores() {
    return this.clienteSelecionado === 'PRODEPA';
  }

  onRegiaoChange() {
    this.clienteSelecionado = '';
    this.setorSelecionado = '';
  }

  onClienteChange() {
    this.setorSelecionado = '';
  }

  enviar() {
    if (!this.assunto || !this.mensagem) {
      alert('Preencha assunto e mensagem');
      return;
    }

    alert('Informativo enviado com layout profissional 🚀');
  }
}