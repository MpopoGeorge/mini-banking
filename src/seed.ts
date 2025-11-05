import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { DataSource } from 'typeorm';
import { Wallet } from './database/entities/wallet.entity';
import * as bcrypt from 'bcryptjs';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const users = app.get(UsersService);
  const ds = app.get(DataSource);

  const email = 'demo@example.com';
  let user = await users.findByEmail(email);
  if (!user) {
    const passwordHash = await bcrypt.hash('password', 10);
    user = await users.create({ email, passwordHash });
  }

  const walletRepo = ds.getRepository(Wallet);
  const usd = await walletRepo.findOne({ where: { user: { id: user.id }, currency: 'USD' } });
  if (!usd) {
    await walletRepo.save(walletRepo.create({ user: { id: user.id } as any, currency: 'USD', balanceCents: 100_000 }));
  }
  const eur = await walletRepo.findOne({ where: { user: { id: user.id }, currency: 'EUR' } });
  if (!eur) {
    await walletRepo.save(walletRepo.create({ user: { id: user.id } as any, currency: 'EUR', balanceCents: 50_000 }));
  }

  await app.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


