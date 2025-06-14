#![cfg_attr(not(feature = "std"), no_std, no_main)]

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
        id: u64,
        luma_event_id: String,
        owner: AccountId,
        metadata: String,
        minted_at: u64,
    }

    /// Main contract storage - simple NFT structure
    #[ink(storage)]
    pub struct AttendanceNFT {
        // NFT ID -> NFT
        nfts: Mapping<u64, AttendanceNft>,
        // Account -> List of owned NFT IDs
        owned_nfts: Mapping<AccountId, Vec<u64>>,
        // Track who minted for which event (prevent duplicates)
        event_attendees: Mapping<(String, AccountId), bool>,
        // Total NFTs minted
        nft_count: u64,
        // Contract owner (for future upgrades/admin tasks only)
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
                event_attendees: Mapping::new(),
                nft_count: 0,
                owner: Self::env().caller(),
            }
        }

        /// Mint NFT to specified recipient - backend service can mint for attendees
        #[ink(message)]
        pub fn mint_nft(&mut self, luma_event_id: String, recipient: AccountId, metadata: String) -> bool {
            // Check if recipient already has NFT for this event
            let event_key = (luma_event_id.clone(), recipient);
            if self.event_attendees.get(&event_key).unwrap_or(false) {
                return false; // Already minted for this event
            }

            let nft_id = self.nft_count.checked_add(1).expect("NFT count overflow");
            let current_block = self.env().block_timestamp();

            let nft = AttendanceNft {
                id: nft_id,
                luma_event_id: luma_event_id.clone(),
                owner: recipient, // Mint to the specified recipient
                metadata,
                minted_at: current_block,
            };

            self.nfts.insert(nft_id, &nft);

            // Update owned NFTs for the recipient
            let mut owned = self.owned_nfts.get(recipient).unwrap_or_default();
            owned.push(nft_id);
            self.owned_nfts.insert(recipient, &owned);

            // Mark as minted for this event and recipient
            self.event_attendees.insert(&event_key, &true);

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

        /// Check if account already has NFT for a specific event
        #[ink(message)]
        pub fn has_attended_event(&self, luma_event_id: String, account: AccountId) -> bool {
            self.event_attendees.get(&(luma_event_id, account)).unwrap_or(false)
        }

        /// Get total number of NFTs
        #[ink(message)]
        pub fn get_nft_count(&self) -> u64 {
            self.nft_count
        }

        /// Get contract owner (kept for potential future use)
        #[ink(message)]
        pub fn get_owner(&self) -> AccountId {
            self.owner
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::test;

        #[ink::test]
        fn anyone_can_mint() {
            // Get test accounts
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();

            // Create a new contract
            let mut contract = AttendanceNFT::new();

            // Alice (caller) mints NFT for Bob
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            let success = contract.mint_nft(
                String::from("evt_12345"),
                accounts.bob,
                String::from("{\"name\":\"Polkadot Meetup\",\"description\":\"Attendance proof\"}")
            );

            assert!(success);
            assert_eq!(contract.get_nft_count(), 1);

            // Alice mints NFT for Charlie
            let success2 = contract.mint_nft(
                String::from("evt_12345"),
                accounts.charlie,
                String::from("{\"name\":\"Polkadot Meetup\",\"description\":\"Attendance proof\"}")
            );

            assert!(success2);
            assert_eq!(contract.get_nft_count(), 2);

            // Check ownership
            let bob_nfts = contract.get_owned_nfts(accounts.bob);
            assert_eq!(bob_nfts.len(), 1);
            
            let charlie_nfts = contract.get_owned_nfts(accounts.charlie);
            assert_eq!(charlie_nfts.len(), 1);
        }

        #[ink::test]
        fn cannot_mint_duplicate_for_same_event() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AttendanceNFT::new();

            // Alice mints for Bob
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            contract.mint_nft(
                String::from("evt_12345"),
                accounts.bob,
                String::from("{\"description\":\"First mint\"}")
            );

            // Alice tries to mint again for Bob for same event
            let duplicate_mint = contract.mint_nft(
                String::from("evt_12345"),
                accounts.bob,
                String::from("{\"description\":\"Duplicate attempt\"}")
            );

            assert!(!duplicate_mint); // Should fail
            assert_eq!(contract.get_nft_count(), 1); // Still only 1 NFT
        }

        #[ink::test]
        fn can_mint_for_different_events() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AttendanceNFT::new();

            test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            
            // Mint for Bob for first event
            contract.mint_nft(
                String::from("evt_12345"),
                accounts.bob,
                String::from("{\"description\":\"Event 1\"}")
            );

            // Mint for Bob for second event
            let success = contract.mint_nft(
                String::from("evt_67890"),
                accounts.bob,
                String::from("{\"description\":\"Event 2\"}")
            );

            assert!(success);
            assert_eq!(contract.get_nft_count(), 2);
            
            let bob_nfts = contract.get_owned_nfts(accounts.bob);
            assert_eq!(bob_nfts.len(), 2);
        }
    }
}