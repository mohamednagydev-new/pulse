-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN "raffleWinnerId" TEXT;

-- AlterTable
ALTER TABLE "ChallengeParticipant" ADD COLUMN "halfRewardedAt" DATETIME;
