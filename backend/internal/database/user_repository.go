package database

import (
	"github.com/samuelarogbonlo/polkadot-attendance-nft/backend/internal/models"
	"gorm.io/gorm"
)

// FindOrCreateByWallet finds a user by wallet address or creates one if not found
func (r *UserRepository) FindOrCreateByWallet(walletAddress string) (*models.User, error) {
	var user models.User
	err := r.db.Where("wallet_address = ?", walletAddress).First(&user).Error
	if err == gorm.ErrRecordNotFound {
		user = models.User{WalletAddress: walletAddress}
		if err := r.db.Create(&user).Error; err != nil {
			return nil, err
		}
		return &user, nil
	}
	return &user, err
}
