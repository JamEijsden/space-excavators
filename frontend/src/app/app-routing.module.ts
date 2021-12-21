import { DeactivateGuard } from './_services/deactivate.service';
import { HomeModule } from './home/home.module';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./home/home.module').then(m => m.HomeModule),
    canDeactivate: [DeactivateGuard]
  },
  {
    path: 'game',
    loadChildren: () => import('./game/scene/scene.module').then(m => m.SceneModule)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
