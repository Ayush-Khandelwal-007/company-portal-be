CREATE TABLE `MercorUsers` (
    `userId` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) UNIQUE NOT NULL,
    `name` VARCHAR(255),
    `phone` VARCHAR(255),
    `residence` JSON,
    `profilePic` TEXT,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `lastLogin` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `notes` TEXT,
    `referralCode` VARCHAR(255) UNIQUE DEFAULT (UUID()),
    `isGptEnabled` BOOLEAN NOT NULL DEFAULT FALSE,
    `preferredRole` VARCHAR(255),
    `fullTimeStatus` VARCHAR(255),
    `workAvailability` VARCHAR(255),
    `fullTimeSalaryCurrency` VARCHAR(255),
    `fullTimeSalary` VARCHAR(255),
    `partTimeSalaryCurrency` VARCHAR(255),
    `partTimeSalary` VARCHAR(255),
    `fullTime` BOOLEAN NOT NULL DEFAULT FALSE,
    `fullTimeAvailability` INT,
    `partTime` BOOLEAN NOT NULL DEFAULT FALSE,
    `partTimeAvailability` INT,
    `w8BenUrl` JSON,
    `tosUrl` TEXT,
    `policyUrls` JSON,
    `isPreVetted` BOOLEAN NOT NULL DEFAULT FALSE,
    `isActive` BOOLEAN NOT NULL DEFAULT FALSE,
    `isComplete` BOOLEAN NOT NULL DEFAULT FALSE,
    `summary` TEXT,
    `preVettedAt` DATETIME,
    PRIMARY KEY (`userId`)
);
CREATE TABLE `Skills` (
    `skillId` VARCHAR(255) NOT NULL,
    `skillName` VARCHAR(255) NOT NULL,
    `skillValue` VARCHAR(255) UNIQUE NOT NULL,
    PRIMARY KEY (`skillId`)
);
CREATE TABLE `MercorUserSkills` (
    `userId` VARCHAR(255),
    `skillId` VARCHAR(255),
    `isPrimary` BOOLEAN NOT NULL DEFAULT FALSE,
    `order` INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`userId`, `skillId`),
    FOREIGN KEY (`userId`) REFERENCES `MercorUsers`(`userId`) ON DELETE CASCADE,
    FOREIGN KEY (`skillId`) REFERENCES `Skills`(`skillId`) ON DELETE CASCADE
);
CREATE TABLE `UserResume` (
    `resumeId` VARCHAR(255) NOT NULL,
    `url` TEXT,
    `filename` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `source` VARCHAR(255) NOT NULL DEFAULT 'platform',
    `ocrText` TEXT,
    `ocrEmail` VARCHAR(255),
    `ocrGithubUsername` VARCHAR(255),
    `resumeBasedQuestions` TEXT,
    `userId` VARCHAR(255) UNIQUE,
    `isInvitedToInterview` BOOLEAN NOT NULL DEFAULT FALSE,
    `reminderTasksIds` JSON,
    PRIMARY KEY (`resumeId`),
    FOREIGN KEY (`userId`) REFERENCES `MercorUsers`(`userId`) ON DELETE CASCADE
);
CREATE TABLE `PersonalInformation` (
    `personalInformationId` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255),
    `location` JSON,
    `email` JSON,
    `phone` JSON,
    `resumeId` VARCHAR(255),
    PRIMARY KEY (`personalInformationId`),
    FOREIGN KEY (`resumeId`) REFERENCES `UserResume`(`resumeId`) ON DELETE CASCADE
);
CREATE TABLE `WorkExperience` (
    `workExperienceId` VARCHAR(255) NOT NULL,
    `company` VARCHAR(255),
    `role` VARCHAR(255),
    `startDate` VARCHAR(255),
    `endDate` VARCHAR(255),
    `description` TEXT,
    `locationCity` VARCHAR(255),
    `locationCountry` VARCHAR(255),
    `resumeId` VARCHAR(255),
    PRIMARY KEY (`workExperienceId`),
    FOREIGN KEY (`resumeId`) REFERENCES `UserResume`(`resumeId`) ON DELETE CASCADE,
    INDEX `workExperience_company_index` (`company`)
);
CREATE TABLE `Education` (
    `educationId` VARCHAR(255) NOT NULL,
    `degree` VARCHAR(255),
    `major` VARCHAR(255),
    `school` VARCHAR(255),
    `startDate` VARCHAR(255),
    `endDate` VARCHAR(255),
    `grade` VARCHAR(255),
    `resumeId` VARCHAR(255),
    PRIMARY KEY (`educationId`),
    FOREIGN KEY (`resumeId`) REFERENCES `UserResume`(`resumeId`) ON DELETE CASCADE,
    INDEX `education_school_index` (`school`)
);