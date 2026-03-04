import * as dns from 'dns';
// Force Google DNS to bypass system DNS issues with MongoDB Atlas SRV lookups
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bodyParser: false,
    });

    // Increase JSON body size limit for base64 image uploads
    app.use(json({ limit: '20mb' }));
    app.use(urlencoded({ extended: true, limit: '20mb' }));

    app.setGlobalPrefix('api');

    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:8080',
        credentials: true,
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    const port = process.env.PORT || 3001;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 NutrifiedAI API running on port ${port}`);
}
bootstrap();
