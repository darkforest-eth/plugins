//SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

interface DarkForestTokens{
    function transferFrom(address from, address to, uint256 tokenID) external;
}


contract Market{
  
    struct Listing{
        address owner;       // who owns the listed artifact
        uint256 buyoutPrice; // buy out price, any bid greater will buy the artifact instantly
    }

    address public admin;  // The admin can change the fee and also reset the token contract after each new round
    uint256 public endDate;
    uint256 public fee;
    mapping(uint256 => Listing) public listings; // all listings 
    
    DarkForestTokens private DFTokens; 
        
    constructor(address tokensAddress, uint256 date, uint256 _fee){
        admin = msg.sender; // fee reciever
        DFTokens = DarkForestTokens(tokensAddress);  
        endDate = date;
        fee = _fee; // flat fee on each listing: probably set this to a couple cents?
    }


    // sendValue from openZeppelin Address library https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Address.sol
    function sendValue(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, "Address: insufficient balance");
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Address: unable to send value, recipient may have reverted");
    }

    function list(uint256 tokenID, uint256 price) external  {
        
        listings[tokenID] = Listing({
            owner: msg.sender,
            buyoutPrice: price
        });

        DFTokens.transferFrom(msg.sender, address(this), tokenID);        
    }

    // buying function. User input is the price they pay AFTER fee
    function buy(uint256 tokenID) external payable  {
        Listing memory oldListing = listings[tokenID];
        
        listings[tokenID]= Listing({
            owner: address(0),
            buyoutPrice: 0
        });
        require (msg.value == oldListing.buyoutPrice+fee, "wrong value");
        DFTokens.transferFrom(address(this), msg.sender, tokenID);
        sendValue(payable(oldListing.owner), oldListing.buyoutPrice);
    }
    
    
    // Unlist a token you listed
    // Useful if you want your tokens back
    function unlist (uint256 id) external {
        address holder = listings[id].owner;
        require(msg.sender == holder);
        
        listings[id]= Listing({
            owner: address(0),
            buyoutPrice: 0
        });
        
        DFTokens.transferFrom(address(this), holder, id);
    }


    
    // ADMIN FUNCTIONS
    
    // Change the tokens address between rounds
    function newRound(uint256 date, address tokens) external{
        require(block.timestamp>endDate,"too early");
        require(msg.sender == admin, "admin function only");
        endDate = date;
        DFTokens = DarkForestTokens(tokens);
    }

    // Collect fees between rounds
    function collectFees() external{
        require(block.timestamp>endDate,"too early");
        require(msg.sender == admin, "admin function only");
        sendValue(payable(admin), address(this).balance);
    }
    
    // change the fee
    function changeFee(uint256 newFee) external{
        require (msg.sender == admin);
        require (fee <= 0.75 ether,"don't be greedy!"); // on xdai '1 ether' = 1 XDAI
        fee = newFee;
    }

}

