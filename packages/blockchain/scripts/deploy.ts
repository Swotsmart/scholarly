import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with account:', deployer.address);
  console.log('Account balance:', (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy ScholarlyToken
  console.log('\n1. Deploying ScholarlyToken...');
  const ScholarlyToken = await ethers.getContractFactory('ScholarlyToken');
  const scholarlyToken = await ScholarlyToken.deploy(deployer.address);
  await scholarlyToken.waitForDeployment();
  const tokenAddress = await scholarlyToken.getAddress();
  console.log('ScholarlyToken deployed to:', tokenAddress);

  // Deploy CredentialNFT
  console.log('\n2. Deploying CredentialNFT...');
  const CredentialNFT = await ethers.getContractFactory('CredentialNFT');
  const credentialNFT = await CredentialNFT.deploy(deployer.address);
  await credentialNFT.waitForDeployment();
  const nftAddress = await credentialNFT.getAddress();
  console.log('CredentialNFT deployed to:', nftAddress);

  // Deploy BookingEscrow (treasury = deployer for now)
  console.log('\n3. Deploying BookingEscrow...');
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  const BookingEscrow = await ethers.getContractFactory('BookingEscrow');
  const bookingEscrow = await BookingEscrow.deploy(deployer.address, treasuryAddress);
  await bookingEscrow.waitForDeployment();
  const escrowAddress = await bookingEscrow.getAddress();
  console.log('BookingEscrow deployed to:', escrowAddress);

  // Deploy ReputationRegistry
  console.log('\n4. Deploying ReputationRegistry...');
  const ReputationRegistry = await ethers.getContractFactory('ReputationRegistry');
  const reputationRegistry = await ReputationRegistry.deploy(deployer.address);
  await reputationRegistry.waitForDeployment();
  const reputationAddress = await reputationRegistry.getAddress();
  console.log('ReputationRegistry deployed to:', reputationAddress);

  // Summary
  console.log('\n========================================');
  console.log('Deployment Summary');
  console.log('========================================');
  console.log('ScholarlyToken:      ', tokenAddress);
  console.log('CredentialNFT:       ', nftAddress);
  console.log('BookingEscrow:       ', escrowAddress);
  console.log('ReputationRegistry:  ', reputationAddress);
  console.log('Treasury:            ', treasuryAddress);
  console.log('========================================');

  // Write addresses to file for later use
  const fs = await import('fs');
  const addresses = {
    network: process.env.HARDHAT_NETWORK || 'localhost',
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      ScholarlyToken: tokenAddress,
      CredentialNFT: nftAddress,
      BookingEscrow: escrowAddress,
      ReputationRegistry: reputationAddress,
    },
    treasury: treasuryAddress,
  };

  fs.writeFileSync(
    './deployed-addresses.json',
    JSON.stringify(addresses, null, 2)
  );
  console.log('\nAddresses saved to deployed-addresses.json');

  // Verify on Polygonscan if not local
  if (process.env.HARDHAT_NETWORK && process.env.HARDHAT_NETWORK !== 'localhost') {
    console.log('\nWaiting for block confirmations before verification...');
    // Wait for 5 block confirmations
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log('Run verification with:');
    console.log(`npx hardhat verify --network ${process.env.HARDHAT_NETWORK} ${tokenAddress} ${deployer.address}`);
    console.log(`npx hardhat verify --network ${process.env.HARDHAT_NETWORK} ${nftAddress} ${deployer.address}`);
    console.log(`npx hardhat verify --network ${process.env.HARDHAT_NETWORK} ${escrowAddress} ${deployer.address} ${treasuryAddress}`);
    console.log(`npx hardhat verify --network ${process.env.HARDHAT_NETWORK} ${reputationAddress} ${deployer.address}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
