pragma solidity 0.5.0;

contract LibTournament {

    enum TournamentStatus {
        ACTIVE,
        COMPLETED,
        FAILED
    }

    struct Tournament {
        // Entry fee
        uint256 entryFee;
        // Can users enter multiple times
        bool isMultiEntry;
        // Minimum entries
        uint256 minEntries;
        // Maximum entries
        uint256 maxEntries;
        // Unique id of prize table
        bytes32 prizeTable;
        // Participants in tournament
        address[] entries;
        // Final standings
        uint256[] finalStandings;
        // Claimed amounts from entries based on prize table and final standings
        mapping (uint256 => bool) claimed;
        // Tournament status based on enum
        uint8 status;
    }

}
