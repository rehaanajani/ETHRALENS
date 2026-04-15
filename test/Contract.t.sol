// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

contract Sample {
    uint public value;

    function set(uint x) public {
        value = x;
    }
}

contract SampleTest is Test {
    Sample sample;

    function setUp() public {
        sample = new Sample();
    }

    function test_SetValue() public {
        sample.set(10);
        assertEq(sample.value(), 10);
    }
}
