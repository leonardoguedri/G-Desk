import { Injectable } from '@angular/core';

export interface InformativoPayload {
  regiao: string;
  mensagemHtml: string;
  anexos: File[];
}

@Injectable({ providedIn: 'root' })
export class InformativosService {

  enviarInformativo(payload: InformativoPayload): Promise<void> {
    console.log('Payload enviado (mock):', payload);

    return new Promise((resolve) => {
      setTimeout(() => resolve(), 1500);
    });
  }

}
