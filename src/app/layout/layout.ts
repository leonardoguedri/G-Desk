import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';
import { NotificacaoService } from '../services/notificacao.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css']
})
export class LayoutComponent implements OnInit, OnDestroy {

  sidebarMinimizada = false;
  mostrarNotificacoes = false;
  usuarioLogado: any = JSON.parse(localStorage.getItem('usuario') || '{}');

  constructor(
    private router: Router,
    private authService: AuthService,
    public notificacaoService: NotificacaoService
  ) {}

  ngOnInit() {
    if (this.usuarioLogado.id) {
      this.notificacaoService.iniciar(this.usuarioLogado.id);
    }
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  this.nomeUsuario = usuario.nome || ''; 
   this.emailUsuario = usuario.email || '';
  }

  ngOnDestroy() {
    this.notificacaoService.parar();
  }

  toggleSidebar() {
    this.sidebarMinimizada = !this.sidebarMinimizada;
  }

    async marcarTodasLidas() {
    await this.notificacaoService.marcarTodasLidas(this.usuarioLogado.id);
  }

  abrirChamado(chamado_id: number, notificacao_id: number | null) {
    if (notificacao_id) {
      this.notificacaoService.marcarComoLida(notificacao_id, this.usuarioLogado.id);
    }
    this.mostrarNotificacoes = false;
    this.router.navigate(['/chamado', chamado_id]);
  }

  sair() {
    this.notificacaoService.parar();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

// aparecer o nome do usurario em cima dando as boasvindas 
nomeUsuario: string = '';
emailUsuario: string = '';


}