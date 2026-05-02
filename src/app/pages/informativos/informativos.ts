import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-informativos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './informativos.html',
  styleUrls: ['./informativos.css']
})
export class InformativosComponent implements OnInit {

  // DESTINO
  regiaoSelecionada = '';
  clienteSelecionado = '';
  setorSelecionado = '';
  modoEnvio = 'todos';

  // CONTEÚDO
  assunto = '';
  titulo = '';
  mensagem = '';

  dataAtual = new Date();

  // DADOS DO BANCO
  instituicoes: any[] = [];
  cidades: string[] = [];
  instituicoesFiltradas: any[] = [];
  instituicaoSelecionada: any = null;

  enviando = false;
  sucesso = '';
  erro = '';

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    this.instituicoes = await this.api.get('/instituicoes');
    const set = new Set<string>(this.instituicoes.map((i: any) => i.cidade).filter(Boolean));
    this.cidades = Array.from(set).sort();
    this.cdr.detectChanges();
  }

  get regioes() {
    return this.cidades;
  }

  get clientes() {
    return this.instituicoesFiltradas;
  }

  get mostrarClientes() {
    return !!this.regiaoSelecionada;
  }

  onRegiaoChange() {
    this.clienteSelecionado = '';
    this.instituicaoSelecionada = null;
    this.instituicoesFiltradas = this.instituicoes.filter(
      (i: any) => i.cidade === this.regiaoSelecionada
    );
    this.cdr.detectChanges();
  }

  onClienteChange() {
    this.instituicaoSelecionada = this.instituicoes.find(
      (i: any) => i.nome === this.clienteSelecionado
    ) || null;
  }

gerarHTMLEmail() {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f3f4f6; padding: 0; border-radius: 10px; overflow: hidden;">
      <div style="background: #022689; padding: 20px; text-align: center;">
        <p style="color: white; font-size: 20px; font-weight: bold; margin: 0;">PRODEPA</p>
        <p style="color: #93c5fd; font-size: 12px; margin: 4px 0 0;">Empresa de Tecnologia da Informação e Comunicação do Estado do Pará</p>
      </div>
      <div style="background: white; padding: 24px;">
        <h3 style="margin-bottom: 10px; color: #1e3a5f;">${this.titulo || 'Título do informativo'}</h3>
        <p style="font-size: 12px; color: gray;">${new Date().toLocaleDateString('pt-BR')}</p>
        <div style="margin-top: 15px; line-height: 1.6; color: #374151;">
          ${this.mensagem.replace(/\n/g, '<br>')}
        </div>
      </div>
      <div style="background: #e5e7eb; padding: 12px; font-size: 12px; text-align: center; color: #6b7280;">
        Enviado por PRODEPA-Empresa de Tecnologia da Informação e Comunicação do Estado do Pará
        atravéz da GCI - Guedri Codificando o Impossivel. Você está recebendo esse e-mail por ser
        parceiro da PRODEPA. Por mais informações entre em contato com nossas centrais de atendimento.
      </div>
    </div>
  `;
}

 resultadoEnvio: any = null;

async enviar() {
  if (!this.assunto || !this.mensagem) {
    this.erro = 'Preencha assunto e mensagem.';
    return;
  }

  this.enviando = true;
  this.erro = '';
  this.sucesso = '';
  this.resultadoEnvio = null;

  const payload: any = {
    assunto: this.assunto,
    corpo: this.gerarHTMLEmail()
  };

  if (this.instituicaoSelecionada) {
    payload.instituicao_id = this.instituicaoSelecionada.id;
  } else if (this.regiaoSelecionada) {
    payload.cidade = this.regiaoSelecionada;
  }

  try {
    this.resultadoEnvio = await this.api.post('/informativos/enviar', payload);
    if (this.resultadoEnvio.enviados === 0 && this.resultadoEnvio.naoEnviados === 0) {
      this.erro = 'Nenhum destinatário encontrado.';
    } else {
      this.sucesso = 'Informativo enviado.';
    }
  } catch (e) {
    this.erro = 'Erro ao enviar informativo.';
  } finally {
    this.enviando = false;
    this.cdr.detectChanges();
  }
}
}