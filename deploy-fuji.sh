#!/bin/bash
# Fuji Testnet Deployment Script

echo "Starting deployment to Fuji Testnet..."
echo "You will see a few prompts. Please select the following options using your arrow keys and ENTER:"
echo "1. Network: Choose 'Fuji Testnet'"
echo "2. Payment Key Type: Choose 'Use stored key'"
echo "3. Stored Key: Choose 'fuji_deployer'"

~/bin/avalanche blockchain deploy lanista
