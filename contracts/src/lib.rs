#![cfg_attr(not(feature = "std"), no_std)]

#[ink::contract]
mod attendance_nft {
    use ink::storage::Mapping;
    use ink::prelude::{string::String, vec::Vec};

    /// Represents an NFT token for event attendance
    #[derive(Debug, Clone, scale::Encode, scale::Decode, PartialEq)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct AttendanceNft {
        id: u64,             // Unique NFT ID
        luma_event_id: String, // Luma event ID (string format)
        owner: AccountId,    // NFT owner
        metadata: String,    // JSON metadata with event details
        minted_at: u64,      // Block timestamp
    }

    /// Main contract storage - simplified NFT-only structure
    #[ink(storage)]
    pub struct AttendanceNFT {
        // NFT ID -> NFT
        nfts: Mapping<u64, AttendanceNft>,
        // Account -> List of owned NFT IDs
        owned_nfts: Mapping<AccountId, Vec<u64>>,
        // Total NFTs minted
        nft_count: u64,
        // Contract owner (only owner can mint)
        owner: AccountId,
    }

    /// Events emitted by the contract
    #[ink(event)]
    pub struct NFTMinted {
        #[ink(topic)]
        nft_id: u64,
        #[ink(topic)]
        recipient: AccountId,
        luma_event_id: String,
    }

    impl Default for AttendanceNFT {
        fn default() -> Self {
            Self::new()
        }
    }

    impl AttendanceNFT {
        /// Constructor initializes empty contract
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                nfts: Mapping::new(),
                owned_nfts: Mapping::new(),
                nft_count: 0,
                owner: Self::env().caller(),
            }
        }

        /// Mint a new NFT for event attendance (owner-only)
        #[ink(message)]
        pub fn mint_nft(&mut self, luma_event_id: String, recipient: AccountId, metadata: String) -> bool {
            let caller = self.env().caller();

            // Only contract owner can mint
            if caller != self.owner {
                return false;
            }

            let nft_id = self.nft_count.checked_add(1).expect("NFT count overflow");
            let current_block = self.env().block_timestamp();

            let nft = AttendanceNft {
                id: nft_id,
                luma_event_id: luma_event_id.clone(),
                owner: recipient,
                metadata,
                minted_at: current_block,
            };

            self.nfts.insert(nft_id, &nft);

            // Update owned NFTs
            let mut owned = self.owned_nfts.get(recipient).unwrap_or_default();
            owned.push(nft_id);
            self.owned_nfts.insert(recipient, &owned);

            self.nft_count = nft_id;

            // Emit event
            self.env().emit_event(NFTMinted {
                nft_id,
                recipient,
                luma_event_id,
            });

            true
        }

        /// Get NFT by ID
        #[ink(message)]
        pub fn get_nft(&self, nft_id: u64) -> Option<AttendanceNft> {
            self.nfts.get(nft_id)
        }

        /// Get all NFTs owned by an account
        #[ink(message)]
        pub fn get_owned_nfts(&self, owner: AccountId) -> Vec<u64> {
            self.owned_nfts.get(owner).unwrap_or_default()
        }

        /// Get total number of NFTs
        #[ink(message)]
        pub fn get_nft_count(&self) -> u64 {
            self.nft_count
        }

        /// Get contract owner
        #[ink(message)]
        pub fn get_owner(&self) -> AccountId {
            self.owner
        }

        /// Transfer ownership (current owner only)
        #[ink(message)]
        pub fn transfer_ownership(&mut self, new_owner: AccountId) -> bool {
            let caller = self.env().caller();
            if caller != self.owner {
                return false;
            }
            self.owner = new_owner;
            true
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::test;

        #[ink::test]
        fn constructor_works() {
            let contract = AttendanceNFT::new();
            assert_eq!(contract.get_nft_count(), 0);
            assert_eq!(contract.get_owner(), test::default_accounts::<ink::env::DefaultEnvironment>().alice);
        }

        #[ink::test]
        fn mint_nft_works() {
            // Get test accounts
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();

            // Create a new contract (Alice is owner)
            let mut contract = AttendanceNFT::new();

            // Mint an NFT as owner
            let success = contract.mint_nft(
                String::from("evt_12345"),
                accounts.bob,
                String::from("{\"name\":\"Polkadot Meetup\",\"description\":\"Attendance proof for Polkadot Meetup\"}")
            );

            // Verify minting was successful
            assert!(success);
            assert_eq!(contract.get_nft_count(), 1);

            // Check if Bob owns the NFT
            let bob_nfts = contract.get_owned_nfts(accounts.bob);
            assert_eq!(bob_nfts.len(), 1);
            assert_eq!(bob_nfts[0], 1);

            // Check the NFT details
            let nft = contract.get_nft(1).unwrap();
            assert_eq!(nft.id, 1);
            assert_eq!(nft.luma_event_id, "evt_12345");
            assert_eq!(nft.owner, accounts.bob);
        }

        #[ink::test]
        fn unauthorized_mint_fails() {
            // Get test accounts
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();

            // Create a new contract (Alice is owner)
            let mut contract = AttendanceNFT::new();

            // Try to mint as Bob (unauthorized)
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            let success = contract.mint_nft(
                String::from("evt_12345"),
                accounts.charlie,
                String::from("{\"description\":\"Attendance proof\"}")
            );

            // Verify minting failed
            assert!(!success);
            assert_eq!(contract.get_nft_count(), 0);
        }

        #[ink::test]
        fn ownership_transfer_works() {
            // Get test accounts
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();

            // Create a new contract (Alice is owner)
            let mut contract = AttendanceNFT::new();

            // Transfer ownership to Bob
            let success = contract.transfer_ownership(accounts.bob);
            assert!(success);
            assert_eq!(contract.get_owner(), accounts.bob);

            // Now Bob can mint
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            let mint_success = contract.mint_nft(
                String::from("evt_12345"),
                accounts.charlie,
                String::from("{\"description\":\"Attendance proof\"}")
            );
            assert!(mint_success);
        }

        #[ink::test]
        fn unauthorized_ownership_transfer_fails() {
            // Get test accounts
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();

            // Create a new contract (Alice is owner)
            let mut contract = AttendanceNFT::new();

            // Try to transfer ownership as Bob (unauthorized)
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            let success = contract.transfer_ownership(accounts.charlie);
            assert!(!success);
            assert_eq!(contract.get_owner(), accounts.alice);
        }
    }
}