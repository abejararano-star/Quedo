-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(190) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('HOST', 'ADMIN') NOT NULL DEFAULT 'HOST',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_tokenHash_key`(`tokenHash`),
    INDEX `Session_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Listing` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(190) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `summary` VARCHAR(250) NOT NULL,
    `description` TEXT NOT NULL,
    `city` VARCHAR(100) NOT NULL DEFAULT 'Quibdó',
    `district` VARCHAR(100) NOT NULL,
    `type` VARCHAR(40) NOT NULL,
    `capacity` INTEGER NOT NULL,
    `bedrooms` INTEGER NOT NULL DEFAULT 1,
    `beds` INTEGER NOT NULL DEFAULT 1,
    `bathrooms` INTEGER NOT NULL DEFAULT 1,
    `priceNight` INTEGER NOT NULL,
    `priceWeek` INTEGER NULL,
    `extraCosts` VARCHAR(500) NOT NULL,
    `amenities` JSON NOT NULL,
    `photos` JSON NOT NULL,
    `houseRules` TEXT NOT NULL,
    `whatsapp` VARCHAR(20) NULL,
    `status` ENUM('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED', 'PAUSED') NOT NULL DEFAULT 'DRAFT',
    `isDemo` BOOLEAN NOT NULL DEFAULT false,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNote` VARCHAR(500) NULL,
    `rnt` VARCHAR(30) NULL,
    `hostId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Listing_slug_key`(`slug`),
    INDEX `Listing_status_city_district_idx`(`status`, `city`, `district`),
    INDEX `Listing_status_priceNight_idx`(`status`, `priceNight`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Media` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `mime` VARCHAR(40) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Media_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contact` (
    `id` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Contact_listingId_createdAt_idx`(`listingId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PageView` (
    `id` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PageView_listingId_createdAt_idx`(`listingId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Report` (
    `id` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `resolved` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(100) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `note` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entityId_createdAt_idx`(`entityId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RateLimit` (
    `key` VARCHAR(190) NOT NULL,
    `hits` INTEGER NOT NULL DEFAULT 1,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `RateLimit_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Listing` ADD CONSTRAINT `Listing_hostId_fkey` FOREIGN KEY (`hostId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Media` ADD CONSTRAINT `Media_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contact` ADD CONSTRAINT `Contact_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PageView` ADD CONSTRAINT `PageView_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- AlterTable
ALTER TABLE `Contact` ADD COLUMN `isSimulated` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `status` ENUM('INITIATED', 'RESPONDED', 'CONFIRMED', 'LOST') NOT NULL DEFAULT 'INITIATED',
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `visitId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `PageView` ADD COLUMN `isSimulated` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `visitId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `isTest` BOOLEAN NOT NULL DEFAULT false;

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


ALTER TABLE `User` MODIFY `role` ENUM('HOST','ADMIN','GUEST') NOT NULL DEFAULT 'HOST';
CREATE TABLE `Favorite` (
  `userId` VARCHAR(191) NOT NULL,
  `listingId` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`userId`, `listingId`),
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
