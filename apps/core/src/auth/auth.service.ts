import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterOwnerDto } from './dto/auth.dto';
import * as argon2 from 'argon2';
import { Role } from 'generated/prisma/enums';
import { RpcException } from '@nestjs/microservices';
import { AuthErrorCode } from '@app-k/shared';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(private readonly prisma:PrismaService, private readonly jwtService:JwtService){}

    async registerOwner(dto:RegisterOwnerDto){
        const email = dto.email.trim().toLowerCase()
        const existingUser = await this.prisma.user.findUnique({
            where:{
                email
            }
        })

        if (existingUser){
            throw new RpcException({
                code: AuthErrorCode.EMAIL_ALREADY_EXISTS,
                message: 'Email already registered'
            })
        }
        
        const passwordHash = await argon2.hash(dto.password)

        const user = await this.prisma.$transaction(async (tx) => {
            const merchant = await tx.merchant.create({
                data: {
                    name: dto.merchantName
                }
            })

            return tx.user.create({
                data: {
                    fullName: dto.fullName,
                    email,
                    passwordHash,
                    role: Role.OWNER, 
                    merchantId: merchant.id
                },
                select: {
                    id: true, 
                    merchantId: true, 
                    fullName: true,
                    email: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                }
            })
        })
        return user
    }


    async login(dto:LoginDto){
        const userExist = await this.prisma.user.findUnique({
            where: {
                email: dto.email
            }
        })
        if (!userExist){
            throw new RpcException({
                code: AuthErrorCode.INVALID_CREDENTIALS,
                message: "Invalid email or password" 
            }) 
        }

        const validPassword = await argon2.verify(userExist.passwordHash, dto.password)
        if(!validPassword){
            throw new RpcException({
                code: AuthErrorCode.INVALID_CREDENTIALS,
                message: "Invalid email or password"
            }) 
        }

        if(!userExist.isActive){
            throw new RpcException({
                code: AuthErrorCode.USER_INACTIVE, 
                message: "User is inactive"
            })
        }

        const accessToken =  await this.jwtService.signAsync({
            sub: userExist.id,
            role: userExist.role,
            merchantId: userExist.merchantId
        })

        return {
            accessToken, 
            user: {
                id: userExist.id,
                merchantId: userExist.merchantId,
                fullName: userExist.fullName,
                email: userExist.email, 
                role: userExist.role,
                isActive: userExist.isActive
            }
        }

    }

    // handle di fe dlu deh ini soalnya ga ada refresh token juga, jd itnggal hapus aja 
    // logout(userId:string){
    //     return userId
    // }

    async getUserById(userId:string){
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            },
            select: {
                id: true,
                merchantId: true,
                fullName: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            }
        })

        if(!user){
            throw new RpcException({
                code: AuthErrorCode.USER_NOT_FOUND, 
                message: "User not found"
            })
        }
        if(!user.isActive){
            throw new RpcException({
                code: AuthErrorCode.USER_INACTIVE,
                message: "User is inactive"
            })
        }
        return user
    }
    
    


}
