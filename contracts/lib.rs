#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod attendance_nft {
    use ink::storage::Mapping;
    use ink::prelude::{string::String, vec::Vec, format, string::ToString};

    /// PSP-34 Standard Token ID
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    #[allow(clippy::cast_possible_truncation)]
    pub enum Id {
        U8(u8),
        U16(u16),
        U32(u32),
        U64(u64),
        U128(u128),
        Bytes(Vec<u8>),
    }

    /// PSP-34 Standard Errors
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    #[allow(clippy::cast_possible_truncation)]
    pub enum PSP34Error {
        Custom(String),
        SelfApprove,
        NotApproved,
        TokenExists,
        TokenNotExists,
        SafeTransferCheckFailed(String),
    }

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

    /// Main contract storage - PSP-34 compliant NFT structure
    #[ink(storage)]
    pub struct AttendanceNFT {
        // PSP-34 Standard Storage
        // Token ID -> Owner
        token_owner: Mapping<Id, AccountId>,
        // Owner -> Approved Operator -> Approval for all tokens
        operator_approvals: Mapping<(AccountId, AccountId), bool>,
        // Token ID -> Approved operator
        token_approvals: Mapping<Id, AccountId>,
        // Owner -> Number of owned tokens
        owned_tokens_count: Mapping<AccountId, u32>,
        // Collection metadata
        collection_id: Id,
        
        // Custom Attendance NFT Storage
        // NFT ID -> NFT Details
        nfts: Mapping<Id, AttendanceNft>,
        // Account -> List of owned NFT IDs
        owned_nfts: Mapping<AccountId, Vec<Id>>,
        // Track who minted for which event (prevent duplicates)
        event_attendees: Mapping<(String, AccountId), bool>,
        // Total NFTs minted
        nft_count: u64,
        // Contract owner (for future upgrades/admin tasks only)
        owner: AccountId,
    }

    /// PSP-34 Standard Events
    #[ink(event)]
    pub struct Transfer {
        #[ink(topic)]
        from: Option<AccountId>,
        #[ink(topic)]
        to: Option<AccountId>,
        #[ink(topic)]
        id: Id,
    }

    #[ink(event)]
    pub struct Approval {
        #[ink(topic)]
        owner: AccountId,
        #[ink(topic)]
        approved: AccountId,
        #[ink(topic)]
        id: Option<Id>,
    }

    #[ink(event)]
    pub struct AttributeSet {
        id: Id,
        key: Vec<u8>,
        data: Vec<u8>,
    }

    // Legacy event for backward compatibility
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
        /// Constructor initializes empty PSP-34 compliant contract
        #[ink(constructor)]
        pub fn new() -> Self {
            let collection_id = Id::U128(0); // Use different ID for collection to avoid conflicts
            Self {
                // PSP-34 Standard
                token_owner: Mapping::new(),
                operator_approvals: Mapping::new(),
                token_approvals: Mapping::new(),
                owned_tokens_count: Mapping::new(),
                collection_id,
                // Custom Storage
                nfts: Mapping::new(),
                owned_nfts: Mapping::new(),
                event_attendees: Mapping::new(),
                nft_count: 0,
                owner: Self::env().caller(),
            }
        }

        // ===================
        // PSP-34 STANDARD METHODS
        // ===================

        /// Returns the collection id of the NFT contract
        #[ink(message)]
        pub fn collection_id(&self) -> Id {
            self.collection_id.clone()
        }

        /// Returns the balance of the owner
        #[ink(message)]
        pub fn balance_of(&self, owner: AccountId) -> u32 {
            self.owned_tokens_count.get(owner).unwrap_or(0)
        }

        /// Returns the owner of the token if any
        #[ink(message)]
        pub fn owner_of(&self, id: Id) -> Option<AccountId> {
            self.token_owner.get(id)
        }

        /// Returns true if the operator is approved by the owner
        #[ink(message)]
        pub fn allowance(&self, owner: AccountId, operator: AccountId, id: Option<Id>) -> bool {
            match id {
                Some(token_id) => {
                    // Check specific token approval
                    if let Some(approved) = self.token_approvals.get(&token_id) {
                        approved == operator
                    } else {
                        // Check operator approval for all tokens
                        self.operator_approvals.get((owner, operator)).unwrap_or(false)
                    }
                }
                None => {
                    // Check operator approval for all tokens
                    self.operator_approvals.get((owner, operator)).unwrap_or(false)
                }
            }
        }

        /// Approves `operator` to withdraw the `id` token from the caller's account
        #[ink(message)]
        pub fn approve(&mut self, operator: AccountId, id: Option<Id>, approved: bool) -> Result<(), PSP34Error> {
            let caller = self.env().caller();
            
            if caller == operator {
                return Err(PSP34Error::SelfApprove);
            }

            match id {
                Some(token_id) => {
                    // Approve specific token
                    let owner = self.token_owner.get(&token_id).ok_or(PSP34Error::TokenNotExists)?;
                    if owner != caller {
                        return Err(PSP34Error::NotApproved);
                    }

                    if approved {
                        self.token_approvals.insert(&token_id, &operator);
                    } else {
                        self.token_approvals.remove(&token_id);
                    }

                    self.env().emit_event(Approval {
                        owner: caller,
                        approved: operator,
                        id: Some(token_id),
                    });
                }
                None => {
                    // Approve all tokens
                    if approved {
                        self.operator_approvals.insert((caller, operator), &true);
                    } else {
                        self.operator_approvals.remove((caller, operator));
                    }

                    self.env().emit_event(Approval {
                        owner: caller,
                        approved: operator,
                        id: None,
                    });
                }
            }

            Ok(())
        }

        /// Transfer approved or owned token from `owner` to `to`
        #[ink(message)]
        pub fn transfer(&mut self, to: AccountId, id: Id, data: Vec<u8>) -> Result<(), PSP34Error> {
            let caller = self.env().caller();
            self._transfer_token(&caller, &to, &id, &data)?;
            Ok(())
        }

        /// Transfer approved or owned token from `from` to `to`
        #[ink(message)]
        pub fn transfer_from(&mut self, from: AccountId, to: AccountId, id: Id, data: Vec<u8>) -> Result<(), PSP34Error> {
            let caller = self.env().caller();
            
            // Check if caller is approved
            if from != caller && !self.allowance(from, caller, Some(id.clone())) {
                return Err(PSP34Error::NotApproved);
            }

            self._transfer_token(&from, &to, &id, &data)?;
            Ok(())
        }

        /// Returns the total number of tokens in existence
        #[ink(message)]
        pub fn total_supply(&self) -> u128 {
            self.nft_count as u128
        }

        /// Internal transfer function
        fn _transfer_token(&mut self, from: &AccountId, to: &AccountId, id: &Id, _data: &[u8]) -> Result<(), PSP34Error> {
            let owner = self.token_owner.get(id).ok_or(PSP34Error::TokenNotExists)?;
            
            if owner != *from {
                return Err(PSP34Error::NotApproved);
            }

            // Update token owner
            self.token_owner.insert(id, to);

            // Update owned tokens count
            let from_balance = self.owned_tokens_count.get(from).unwrap_or(0);
            if from_balance > 0 {
                self.owned_tokens_count.insert(from, &(from_balance.saturating_sub(1)));
            }

            let to_balance = self.owned_tokens_count.get(to).unwrap_or(0);
            self.owned_tokens_count.insert(to, &(to_balance.saturating_add(1)));

            // Update owned NFTs lists
            let mut from_nfts = self.owned_nfts.get(from).unwrap_or_default();
            from_nfts.retain(|token_id| token_id != id);
            self.owned_nfts.insert(from, &from_nfts);

            let mut to_nfts = self.owned_nfts.get(to).unwrap_or_default();
            to_nfts.push(id.clone());
            self.owned_nfts.insert(to, &to_nfts);

            // Clear approvals
            self.token_approvals.remove(id);

            // Emit standard Transfer event
            self.env().emit_event(Transfer {
                from: Some(*from),
                to: Some(*to),
                id: id.clone(),
            });

            Ok(())
        }

        // ===================
        // PSP-34 METADATA METHODS
        // ===================

        /// Returns the attribute of `id` or the collection
        #[ink(message)]
        pub fn get_attribute(&self, id: Id, key: Vec<u8>) -> Option<Vec<u8>> {
            // For collection-level metadata
            if id == self.collection_id {
                match core::str::from_utf8(&key).ok()? {
                    "name" => Some(b"Polkadot Attendance NFT".to_vec()),
                    "symbol" => Some(b"ATTENDNFT".to_vec()),
                    "description" => Some(b"NFT certificates for Polkadot event attendance".to_vec()),
                    "image" => Some(b"https://polkadot-attendance-nft.netlify.app/images/nft-character.png".to_vec()),
                    "external_url" => Some(b"https://polkadot-attendance-nft.netlify.app".to_vec()),
                    "base_uri" => Some(b"https://polkadot-attendance-nft-api.onrender.com/api/nfts/".to_vec()),
                    "contract_version" => Some(b"1.0.0".to_vec()),
                    "standard" => Some(b"PSP34".to_vec()),
                    "total_supply" => Some(self.nft_count.to_string().as_bytes().to_vec()),
                    _ => None,
                }
            } else {
                // For token-level metadata
                if let Some(nft) = self.nfts.get(id) {
                    match core::str::from_utf8(&key).ok()? {
                        "name" => Some(format!("Attendance Certificate #{}", nft.id).as_bytes().to_vec()),
                        "description" => Some(format!("Proof of attendance for event: {}", nft.luma_event_id).as_bytes().to_vec()),
                        "image" => Some(b"https://polkadot-attendance-nft.netlify.app/images/nft-character.png".to_vec()),
                        "external_url" => Some(format!("https://polkadot-attendance-nft.netlify.app/nft/{}", nft.id).as_bytes().to_vec()),
                        "token_uri" => Some(format!("https://polkadot-attendance-nft-api.onrender.com/api/nfts/{}/metadata", nft.id).as_bytes().to_vec()),
                        "tokenURI" => Some(format!("https://polkadot-attendance-nft-api.onrender.com/api/nfts/{}/metadata", nft.id).as_bytes().to_vec()),
                        "animation_url" => None, 
                        "background_color" => Some(b"FFFFFF".to_vec()),
                        "attributes" => {
                            let attributes = format!(
                                r#"[{{"trait_type":"Event","value":"{}"}},{{"trait_type":"Mint Date","value":"{}"}},{{"trait_type":"Token ID","value":"{}"}}]"#,
                                nft.luma_event_id,
                                nft.minted_at,
                                nft.id
                            );
                            Some(attributes.as_bytes().to_vec())
                        },
                        "event_id" => Some(nft.luma_event_id.as_bytes().to_vec()),
                        "mint_timestamp" => Some(nft.minted_at.to_string().as_bytes().to_vec()),
                        "token_id" => Some(nft.id.to_string().as_bytes().to_vec()),
                        _ => None,
                    }
                } else {
                    None
                }
            }
        }

        // ===================
        // PSP-34 ENUMERABLE EXTENSION (Required for wallet discovery)
        // ===================

        /// Returns total number of tokens owned by the given address
        /// This is already implemented as balance_of, but adding for clarity
        #[ink(message)]
        pub fn owners_token_by_index(&self, owner: AccountId, index: u128) -> Option<Id> {
            let owned_tokens = self.owned_nfts.get(owner).unwrap_or_default();
            owned_tokens.get(index as usize).cloned()
        }

        /// Returns a token `Id` at a given `index` of all the tokens stored by the contract
        #[ink(message)]
        #[allow(clippy::cast_possible_truncation)]
        pub fn token_by_index(&self, index: u128) -> Option<Id> {
            let token_id = index.checked_add(1)?; // Our tokens start from 1
            if token_id <= self.nft_count as u128 && token_id <= u64::MAX as u128 {
                Some(Id::U64(token_id as u64))
            } else {
                None
            }
        }

        /// Returns what PSP standards this contract supports
        #[ink(message)]
        pub fn supported_standards(&self) -> Vec<String> {
            use ink::prelude::{vec, string::String};
            vec![
                String::from("PSP34"),
                String::from("PSP34Metadata"),
                String::from("PSP34Enumerable"),
            ]
        }

        /// CRITICAL: Interface detection for wallets - MUST have this exact selector
        #[ink(message, selector = 0x4ed3c047)]
        pub fn supports_interface(&self, interface_id: [u8; 4]) -> bool {
            match interface_id {
                // PSP34 interface ID
                [0x3b, 0x06, 0x0f, 0x14] => true,
                // PSP34Metadata interface ID  
                [0xbc, 0x2f, 0x24, 0xc4] => true,
                // PSP34Enumerable interface ID
                [0xe0, 0x93, 0x3b, 0xd7] => true,
                _ => false,
            }
        }

        /// CRITICAL: Standard PSP34 collection_id with exact selector for wallet detection
        #[ink(message, selector = 0x3d261bd5)]
        pub fn psp34_collection_id(&self) -> Id {
            self.collection_id.clone()
        }

        // ===================
        // CUSTOM ATTENDANCE METHODS (Existing functionality)
        // ===================

        /// Mint NFT to specified recipient - PSP-34 compliant version
        #[ink(message)]
        pub fn mint_nft(&mut self, luma_event_id: String, recipient: AccountId, metadata: String) -> bool {
            // Check if recipient already has NFT for this event
            let event_key = (luma_event_id.clone(), recipient);
            if self.event_attendees.get(&event_key).unwrap_or(false) {
                return false; // Already minted for this event
            }

            let nft_id = self.nft_count.checked_add(1).expect("NFT count overflow");
            let token_id = Id::U64(nft_id);
            let current_block = self.env().block_timestamp();

            let nft = AttendanceNft {
                id: nft_id,
                luma_event_id: luma_event_id.clone(),
                owner: recipient,
                metadata,
                minted_at: current_block,
            };

            // PSP-34 compliant storage
            self.token_owner.insert(&token_id, &recipient);
            
            // Update owned tokens count
            let balance = self.owned_tokens_count.get(recipient).unwrap_or(0);
            self.owned_tokens_count.insert(recipient, &(balance.saturating_add(1)));

            // Custom storage
            self.nfts.insert(&token_id, &nft);

            // Update owned NFTs for the recipient
            let mut owned = self.owned_nfts.get(recipient).unwrap_or_default();
            owned.push(token_id.clone());
            self.owned_nfts.insert(recipient, &owned);

            // Mark as minted for this event and recipient
            self.event_attendees.insert(&event_key, &true);

            self.nft_count = nft_id;

            // Emit PSP-34 compliant Transfer event (mint)
            self.env().emit_event(Transfer {
                from: None,
                to: Some(recipient),
                id: token_id.clone(),
            });

            // Emit metadata attribute events for better wallet indexing
            self.env().emit_event(AttributeSet {
                id: token_id.clone(), 
                key: b"name".to_vec(),
                data: format!("Attendance Certificate #{}", nft_id).as_bytes().to_vec(),
            });

            self.env().emit_event(AttributeSet {
                id: token_id.clone(),
                key: b"description".to_vec(), 
                data: format!("Proof of attendance for event: {}", luma_event_id).as_bytes().to_vec(),
            });

            self.env().emit_event(AttributeSet {
                id: token_id.clone(),
                key: b"image".to_vec(),
                data: b"https://polkadot-attendance-nft.netlify.app/images/nft-character.png".to_vec(),
            });

            self.env().emit_event(AttributeSet {
                id: token_id.clone(),
                key: b"token_uri".to_vec(),
                data: format!("https://polkadot-attendance-nft-api.onrender.com/api/nfts/{}/metadata", nft_id).as_bytes().to_vec(),
            });

            // Emit legacy event for backward compatibility
            self.env().emit_event(NFTMinted {
                nft_id,
                recipient,
                luma_event_id,
            });

            true
        }

        /// Get NFT by ID - updated for PSP-34 compatibility
        #[ink(message)]
        pub fn get_nft(&self, nft_id: u64) -> Option<AttendanceNft> {
            let token_id = Id::U64(nft_id);
            self.nfts.get(token_id)
        }

        /// Get all NFTs owned by an account - PSP-34 compatible
        #[ink(message)]
        pub fn get_owned_nfts(&self, owner: AccountId) -> Vec<u64> {
            self.owned_nfts.get(owner).unwrap_or_default()
                .iter()
                .filter_map(|id| match id {
                    Id::U64(num) => Some(*num),
                    _ => None,
                })
                .collect()
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
        fn psp34_mint_works() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AttendanceNFT::new();

            // Test PSP-34 compliant minting
            let success = contract.mint_nft(
                String::from("evt_12345"),
                accounts.bob,
                String::from("{\"name\":\"Polkadot Meetup\",\"description\":\"Attendance proof\"}")
            );

            assert!(success);
            assert_eq!(contract.total_supply(), 1);
            assert_eq!(contract.balance_of(accounts.bob), 1);
            assert_eq!(contract.owner_of(Id::U64(1)), Some(accounts.bob));
        }

        #[ink::test]
        fn psp34_transfer_works() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AttendanceNFT::new();

            // Mint NFT
            contract.mint_nft(
                String::from("evt_12345"),
                accounts.bob,
                String::from("{\"name\":\"Test\",\"description\":\"Test\"}")
            );

            let token_id = Id::U64(1);

            // Set caller to Bob
            test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);

            // Transfer to Charlie
            let result = contract.transfer(accounts.charlie, token_id.clone(), vec![]);
            assert!(result.is_ok());

            // Verify transfer
            assert_eq!(contract.owner_of(token_id), Some(accounts.charlie));
            assert_eq!(contract.balance_of(accounts.bob), 0);
            assert_eq!(contract.balance_of(accounts.charlie), 1);
        }

        #[ink::test]
        fn psp34_metadata_works() {
            let contract = AttendanceNFT::new();

            // Test collection metadata
            let name = contract.get_attribute(Id::U128(0), b"name".to_vec());
            assert!(name.is_some());
            assert_eq!(name.unwrap(), b"Polkadot Attendance NFT".to_vec());
        }

        #[ink::test]
        fn interface_detection_works() {
            let contract = AttendanceNFT::new();
            
            // Test PSP34 interface
            assert!(contract.supports_interface([0x3b, 0x06, 0x0f, 0x14]));
            // Test PSP34Metadata interface
            assert!(contract.supports_interface([0xbc, 0x2f, 0x24, 0xc4]));
            // Test PSP34Enumerable interface
            assert!(contract.supports_interface([0xe0, 0x93, 0x3b, 0xd7]));
            // Test unknown interface
            assert!(!contract.supports_interface([0x00, 0x00, 0x00, 0x00]));
        }

        // Keep existing tests
        #[ink::test]
        fn anyone_can_mint() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AttendanceNFT::new();

            test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            let success = contract.mint_nft(
                String::from("evt_12345"),
                accounts.bob,
                String::from("{\"name\":\"Polkadot Meetup\",\"description\":\"Attendance proof\"}")
            );

            assert!(success);
            assert_eq!(contract.get_nft_count(), 1);

            let success2 = contract.mint_nft(
                String::from("evt_12345"),
                accounts.charlie,
                String::from("{\"name\":\"Polkadot Meetup\",\"description\":\"Attendance proof\"}")
            );

            assert!(success2);
            assert_eq!(contract.get_nft_count(), 2);

            let bob_nfts = contract.get_owned_nfts(accounts.bob);
            assert_eq!(bob_nfts.len(), 1);
            
            let charlie_nfts = contract.get_owned_nfts(accounts.charlie);
            assert_eq!(charlie_nfts.len(), 1);
        }

        #[ink::test]
        fn cannot_mint_duplicate_for_same_event() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AttendanceNFT::new();

            test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            contract.mint_nft(
                String::from("evt_12345"),
                accounts.bob,
                String::from("{\"description\":\"First mint\"}")
            );

            let duplicate_mint = contract.mint_nft(
                String::from("evt_12345"),
                accounts.bob,
                String::from("{\"description\":\"Duplicate attempt\"}")
            );

            assert!(!duplicate_mint);
            assert_eq!(contract.get_nft_count(), 1);
        }

        #[ink::test]
        fn can_mint_for_different_events() {
            let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut contract = AttendanceNFT::new();

            test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
            
            contract.mint_nft(
                String::from("evt_12345"),
                accounts.bob,
                String::from("{\"description\":\"Event 1\"}")
            );

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