-- AlterTable
ALTER TABLE `contact` ADD COLUMN `isSimulated` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `status` ENUM('INITIATED', 'RESPONDED', 'CONFIRMED', 'LOST') NOT NULL DEFAULT 'INITIATED',
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `visitId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `pageview` ADD COLUMN `isSimulated` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `visitId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `isTest` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `ContactEvent` (
    `id` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `status` ENUM('INITIATED', 'RESPONDED', 'CONFIRMED', 'LOST') NOT NULL,
    `note` VARCHAR(500) NULL,
    `lossReason` VARCHAR(100) NULL,
    `actorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContactEvent_contactId_createdAt_idx`(`contactId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VisitSession` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `source` VARCHAR(100) NOT NULL DEFAULT 'directo',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VisitSession_tokenHash_key`(`tokenHash`),
    INDEX `VisitSession_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MembershipEvent` (
    `id` VARCHAR(191) NOT NULL,
    `hostId` VARCHAR(191) NOT NULL,
    `status` ENUM('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED') NOT NULL,
    `plan` VARCHAR(80) NOT NULL,
    `monthlyPrice` INTEGER NOT NULL DEFAULT 0,
    `note` VARCHAR(500) NOT NULL,
    `effectiveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actorId` VARCHAR(191) NOT NULL,

    INDEX `MembershipEvent_hostId_effectiveAt_idx`(`hostId`, `effectiveAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `PageView_listingId_visitId_key` ON `PageView`(`listingId`, `visitId`);

-- AddForeignKey
ALTER TABLE `Contact` ADD CONSTRAINT `Contact_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `VisitSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactEvent` ADD CONSTRAINT `ContactEvent_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactEvent` ADD CONSTRAINT `ContactEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembershipEvent` ADD CONSTRAINT `MembershipEvent_hostId_fkey` FOREIGN KEY (`hostId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembershipEvent` ADD CONSTRAINT `MembershipEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PageView` ADD CONSTRAINT `PageView_visitId_fkey` FOREIGN KEY (`visitId`) REFERENCES `VisitSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

