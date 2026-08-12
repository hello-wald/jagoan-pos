import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { AuthModule } from 'src/auth/auth.module';

// inject tokennya sama jadi import authModule aja 
@Module({
  imports: [AuthModule],
  controllers: [StaffController]
})
export class StaffModule {}
