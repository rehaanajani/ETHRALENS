// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/SimpleVault.sol";

contract SimpleVaultTest is Test {
    SimpleVault vault;
    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");

    function setUp() public {
        vault = new SimpleVault();
        vm.deal(alice, 10 ether);
        vm.deal(bob,   10 ether);
    }

    function test_Deposit() public {
        vm.prank(alice);
        vault.deposit{value: 1 ether}();
        assertEq(vault.balances(alice), 1 ether);
        assertEq(vault.totalDeposits(), 1 ether);
    }

    function test_Withdraw() public {
        vm.prank(alice);
        vault.deposit{value: 2 ether}();

        vm.prank(alice);
        vault.withdraw(1 ether);
        assertEq(vault.balances(alice), 1 ether);
    }

    function test_MultipleUsers() public {
        vm.prank(alice);
        vault.deposit{value: 3 ether}();

        vm.prank(bob);
        vault.deposit{value: 2 ether}();

        assertEq(vault.totalDeposits(), 5 ether);
    }

    function test_GetBalance() public {
        vm.prank(alice);
        vault.deposit{value: 1 ether}();
        assertEq(vault.getBalance(alice), 1 ether);
    }

    function testFail_WithdrawMoreThanBalance() public {
        vm.prank(alice);
        vault.deposit{value: 1 ether}();

        vm.prank(alice);
        vault.withdraw(2 ether); // Should revert
    }
}
