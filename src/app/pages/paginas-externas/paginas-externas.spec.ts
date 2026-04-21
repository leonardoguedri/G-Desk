import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginasExternas } from './paginas-externas';

describe('PaginasExternas', () => {
  let component: PaginasExternas;
  let fixture: ComponentFixture<PaginasExternas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginasExternas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaginasExternas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
