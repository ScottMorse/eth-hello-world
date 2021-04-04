pragma solidity ^0.8.3;

contract Voting {

    mapping (bytes32 => uint256) public votesReceived;

    bytes32[] public candidateList;

    constructor(bytes32[] memory _candidateList) {
        candidateList = _candidateList;
    }

    function totalVotesFor(bytes32 candidate) view public returns (uint256) {
        require(validateCandidate(candidate));
        return votesReceived[candidate];
    }

    function voteForCandidate(bytes32 candidate) public {
        require(validateCandidate(candidate));
        votesReceived[candidate]++;
    }

    function validateCandidate(bytes32 candidate) view public returns (bool) {
        for(uint i = 0; i < candidateList.length; i++){
            if(candidateList[i] == candidate){
                return true;
            }
        }
        return false;
    }
}
