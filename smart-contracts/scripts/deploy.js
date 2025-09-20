const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("🚀 Starting AuditTrail contract deployment...");
    
    const [deployer] = await hre.ethers.getSigners();
    
    console.log("📋 Deployment Details:");
    console.log("├── Network:", hre.network.name);
    console.log("├── Deployer address:", deployer.address);
    console.log("├── Account balance:", hre.ethers.utils.formatEther(await deployer.getBalance()), "ETH");
    
    // Deploy AuditTrail contract
    console.log("\n📦 Deploying AuditTrail contract...");
    const AuditTrail = await hre.ethers.getContractFactory("AuditTrail");
    const auditTrail = await AuditTrail.deploy();
    
    await auditTrail.deployed();
    
    console.log("✅ AuditTrail deployed successfully!");
    console.log("├── Contract address:", auditTrail.address);
    console.log("├── Transaction hash:", auditTrail.deployTransaction.hash);
    console.log("├── Gas used:", auditTrail.deployTransaction.gasLimit.toString());
    
    // Verify initial state
    console.log("\n🔍 Verifying initial contract state...");
    const owner = await auditTrail.owner();
    const isOwnerAuthorized = await auditTrail.authorizedSMEs(deployer.address);
    const totalTransactions = await auditTrail.totalTransactions();
    
    console.log("├── Owner address:", owner);
    console.log("├── Owner authorized:", isOwnerAuthorized);
    console.log("├── Total transactions:", totalTransactions.toString());
    
    // Save deployment information
    const deploymentInfo = {
        network: hre.network.name,
        contractName: "AuditTrail",
        address: auditTrail.address,
        deployer: deployer.address,
        deploymentHash: auditTrail.deployTransaction.hash,
        blockNumber: auditTrail.deployTransaction.blockNumber,
        gasUsed: auditTrail.deployTransaction.gasLimit.toString(),
        timestamp: new Date().toISOString(),
        abi: JSON.parse(auditTrail.interface.format('json'))
    };
    
    // Create deployment info file
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentsDir, `${hre.network.name}-deployment.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    // Also create a general deployment-info.json for backward compatibility
    const generalDeploymentFile = path.join(__dirname, '..', 'deployment-info.json');
    fs.writeFileSync(generalDeploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n💾 Deployment information saved:");
    console.log("├── Network-specific:", deploymentFile);
    console.log("├── General file:", generalDeploymentFile);
    
    // If on localhost, perform some test operations
    if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
        console.log("\n🧪 Running local test operations...");
        
        try {
            // Test authorization
            const testAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
            console.log("├── Authorizing test SME:", testAddress);
            const authTx = await auditTrail.authorizeSME(testAddress, true);
            await authTx.wait();
            
            const isAuthorized = await auditTrail.authorizedSMEs(testAddress);
            console.log("├── Test SME authorized:", isAuthorized);
            
            console.log("✅ Test operations completed successfully!");
        } catch (error) {
            console.log("❌ Test operations failed:", error.message);
        }
    }
    
    console.log("\n🎉 Deployment completed successfully!");
    console.log("📋 Next steps:");
    console.log("├── Update your backend configuration with the contract address");
    console.log("├── Fund SME addresses with ETH for transaction fees");
    console.log("├── Authorize SME addresses using the authorizeSME function");
    console.log("└── Start your backend and frontend applications");
    
    if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
        console.log("\n🔍 Verify contract on Etherscan:");
        console.log(`npx hardhat verify --network ${hre.network.name} ${auditTrail.address}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });