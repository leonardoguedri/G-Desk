import { Component } from '@angular/core';
import { RouterOutlet, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule // 🔥 ESSENCIAL
  ],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css']
})
export class LayoutComponent {

  sidebarMinimizada = false;

  constructor(private router: Router) {}

  toggleSidebar() {
    this.sidebarMinimizada = !this.sidebarMinimizada;
  }

  sair() {
  localStorage.removeItem('usuario');
  this.router.navigate(['/login']);
  
}
// aparecer o nome do usurario em cima dando as boasvindas 
nomeUsuario: string = '';
emailUsuario: string = '';
ngOnInit() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  this.nomeUsuario = usuario.nome || ''; 
   this.emailUsuario = usuario.email || '';

}
}