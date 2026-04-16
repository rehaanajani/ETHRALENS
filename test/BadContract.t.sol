// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

contract Bad {
    uint public value;

    function badSet(uint x) public {
        for (uint i = 0; i < 200; i++) {
            value = x;
        }
    }
}

contract BadTest is Test {
    Bad bad;

    function setUp() public {
        bad = new Bad();
    }

    function test_BadSet() public {
        bad.badSet(10);
    }
}
