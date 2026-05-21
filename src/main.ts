import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => {
    console.error(err);
    const div = document.createElement('div');
    div.style.color = 'red';
    div.style.position = 'fixed';
    div.style.top = '50px';
    div.style.left = '10px';
    div.style.zIndex = '9999';
    div.innerText = 'Bootstrap Error: ' + err.message;
    document.body.appendChild(div);
  });
