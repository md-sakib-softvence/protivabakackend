import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getPolicy() {
    return await this.prisma.policy.findFirst();
  }

  async createPolicy(content: string) {
    const existingPolicy = await this.prisma.policy.findFirst();

    if (existingPolicy) {
      // Update the existing policy
      return await this.prisma.policy.update({
        where: { id: existingPolicy.id },
        data: { content },
      });
    } else {
      // Create a new policy if it doesn't exist

      return await this.prisma.policy.create({
        data: { content },
      });
    }
  }
}
